// Audit the gate NOBODY has checked: triage.
//
// Triage runs BEFORE the mapper and excludes reference-only/skip from it
// entirely. 187 of 456 videos never reach the judge, so a triage error is
// unrecoverable — every hour spent on prefilter reach and judge prompts was
// spent downstream of this.
//
// There are no human labels on excluded videos (labels only exist for surfaced
// ones), so this cannot be scored directly. Instead it finds SUSPECTS: excluded
// videos whose embedding sits unusually close to a project — i.e. videos the
// mapper would likely have accepted had it been allowed to see them.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const R = path.resolve(import.meta.dirname, "..");
const { projectBaselines } = await import(`${R}/dist/agents/project-mapper.js`);
const { blobToVector } = await import(`${R}/dist/search/db.js`);
const { cosineSim } = await import(`${R}/dist/search/rank.js`);
const { loadProjects, projectFacets } = await import(`${R}/dist/schemas/projects.js`);

const triage = JSON.parse(fs.readFileSync(`${R}/videos/triage.json`, "utf8"));
const projects = loadProjects(() => fs.readFileSync(`${R}/projects.json`, "utf8"));
const APPLY = new Set(["apply-now", "evaluate-later"]);

const db = new DatabaseSync(`${R}/videos/search.db`, { readonly: true });
const rows = db
  .prepare(
    "SELECT v.id, v.title, v.category, e.vector FROM videos v JOIN embeddings e ON e.video_id=v.id WHERE e.model=?",
  )
  .all("gemini-embedding-001");
db.close();
const videos = rows.map((r) => ({
  id: r.id,
  title: r.title ?? "",
  category: r.category ?? "",
  vector: blobToVector(r.vector),
}));

const { createAIProvider } = await import(`${R}/node_modules/@juspay/neurolink/dist/index.js`);
const provider = await createAIProvider("vertex");
const pv = [];
for (const p of projects) {
  for (const f of projectFacets(p)) {
    pv.push({
      key: f.key,
      project: f.project,
      vector: Float32Array.from(await provider.embed(f.text, "gemini-embedding-001")),
    });
  }
}

// Baselines must come from the SAME population the mapper uses (apply-tier
// only) or the z-scores are not comparable to the live thresholds.
const eligible = videos.filter((v) => APPLY.has((triage[v.id] ?? {}).tier));
const baselines = projectBaselines(
  eligible.map((v) => v.vector),
  pv,
);

const bestFor = (v) => {
  let best = { project: "-", z: Number.NEGATIVE_INFINITY };
  for (const p of pv) {
    const b = baselines[p.key];
    const sim = cosineSim(v.vector, p.vector);
    const z = b && b.sd > 0 ? (sim - b.mean) / b.sd : sim;
    if (z > best.z) best = { project: p.project, z };
  }
  return best;
};

const counts = {};
for (const v of videos)
  counts[(triage[v.id] ?? {}).tier ?? "(untriaged)"] = (counts[(triage[v.id] ?? {}).tier ?? "(untriaged)"] ?? 0) + 1;
console.log("triage distribution:", JSON.stringify(counts), `\ntotal indexed: ${videos.length}\n`);

const excluded = videos.filter((v) => !APPLY.has((triage[v.id] ?? {}).tier));
const scored = excluded.map((v) => ({
  ...v,
  ...bestFor(v),
  tier: (triage[v.id] ?? {}).tier,
  reason: (triage[v.id] ?? {}).reason ?? "",
}));
scored.sort((a, b) => b.z - a.z);

// 1.25 is CONFIDENCE_MEDIUM_Z — at or above it a mapping would have SURFACED on
// the dashboard, not merely been judged. These are the expensive misses.
const SURFACE_Z = 1.25;
const strong = scored.filter((s) => s.z >= SURFACE_Z);
console.log(
  `EXCLUDED videos scoring at or above the surfacing threshold (z>=${SURFACE_Z}): ${strong.length} of ${excluded.length}\n`,
);
for (const s of strong.slice(0, 30)) {
  console.log(`z=${s.z.toFixed(2)} ${String(s.tier).padEnd(15)} → ${s.project}`);
  console.log(`   ${s.title.replace(/\s+/g, " ").slice(0, 120)}`);
  console.log(`   triage said: ${s.reason.replace(/\s+/g, " ").slice(0, 120)}`);
}

const byTier = {};
for (const s of strong) byTier[s.tier] = (byTier[s.tier] ?? 0) + 1;
console.log(`\nsuspects by tier: ${JSON.stringify(byTier)}`);
const byProj = {};
for (const s of strong) byProj[s.project] = (byProj[s.project] ?? 0) + 1;
console.log(`suspects by project: ${JSON.stringify(byProj)}`);
