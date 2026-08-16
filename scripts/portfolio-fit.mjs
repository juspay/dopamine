// Reach + threshold fit against the CURRENT label set, with a held-out split.
//
// Prefilter reach is a ceiling (the judge can only reject, never add) but it is
// NOT a proxy for end-to-end quality — the facet extension raised reach 94→96%
// while F1 fell 68→64%. So this script sizes the ceiling and re-fits the
// confidence cut points; anything it suggests must still be confirmed with the
// real judge before shipping.
//
// PROJECTS=<path> scores an alternative portfolio; SPLIT=train|test|all picks
// which labels to score on.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const R = path.resolve(import.meta.dirname, "..");
const { prefilterScored, projectBaselines, CONFIDENCE_HIGH_Z, CONFIDENCE_MEDIUM_Z } = await import(
  `${R}/dist/agents/project-mapper.js`
);
const { blobToVector } = await import(`${R}/dist/search/db.js`);
const { loadProjects, projectFacets } = await import(`${R}/dist/schemas/projects.js`);

const TOPK = Number.parseInt(process.env.TOPK ?? "6", 10);
const FLOOR = Number.parseFloat(process.env.FLOOR ?? "0.5");
const SPLIT = process.env.SPLIT ?? "all";
const projectsPath = process.env.PROJECTS ?? `${R}/projects.json`;

const projects = loadProjects(() => fs.readFileSync(projectsPath, "utf8"));
const labels = JSON.parse(fs.readFileSync(`${R}/videos/labels.json`, "utf8")).labels ?? {};
const triage = JSON.parse(fs.readFileSync(`${R}/videos/triage.json`, "utf8"));
const APPLY = new Set(["apply-now", "evaluate-later"]);

const db = new DatabaseSync(`${R}/videos/search.db`, { readonly: true });
const rows = db
  .prepare("SELECT v.id, e.vector FROM videos v JOIN embeddings e ON e.video_id=v.id WHERE e.model=?")
  .all("gemini-embedding-001");
db.close();
const eligible = rows
  .map((r) => ({ id: r.id, vector: blobToVector(r.vector) }))
  .filter((v) => APPLY.has((triage[v.id] ?? {}).tier));
const byId = new Map(eligible.map((v) => [v.id, v]));

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
const baselines = projectBaselines(
  eligible.map((v) => v.vector),
  pv,
);
const norm = (s) => String(s).toLowerCase();

const labelled = Object.keys(labels)
  .filter((id) => byId.has(id))
  .sort();
const ids = SPLIT === "all" ? labelled : labelled.filter((_, i) => (i % 2 === 0) === (SPLIT === "train"));

console.log(`${projectsPath}`);
console.log(`${pv.length} vectors · split=${SPLIT} · ${ids.length} videos\n`);

// Every (video, project) pair the prefilter would offer, with its z and truth.
const pairs = [];
let truth = 0;
for (const id of ids) {
  const human = new Set((labels[id].projects ?? []).map(norm));
  truth += human.size;
  for (const c of prefilterScored(byId.get(id).vector, pv, TOPK, FLOOR, baselines)) {
    pairs.push({ z: c.score, hit: human.has(norm(c.name)), project: c.name });
  }
}
const kept = pairs.filter((p) => p.hit).length;
console.log(
  `REACH: ${kept}/${truth} = ${((kept / truth) * 100).toFixed(0)}%  ·  ${pairs.length} candidates  ·  density ${((kept / pairs.length) * 100).toFixed(0)}%`,
);

const perProj = {};
for (const id of ids) {
  const human = new Set((labels[id].projects ?? []).map(norm));
  const got = new Set(prefilterScored(byId.get(id).vector, pv, TOPK, FLOOR, baselines).map((c) => norm(c.name)));
  for (const p of labels[id].projects ?? []) {
    perProj[p] = perProj[p] ?? { hit: 0, n: 0 };
    perProj[p].n++;
    if (got.has(norm(p))) perProj[p].hit++;
  }
}
console.log("\nper-project reach:");
for (const p of Object.keys(perProj).sort((a, b) => perProj[b].n - perProj[a].n)) {
  const x = perProj[p];
  console.log(
    `  ${p.padEnd(11)} ${String(x.hit).padStart(3)}/${String(x.n).padStart(3)}  ${((x.hit / x.n) * 100).toFixed(0)}%`,
  );
}

// Threshold fit: what fraction of candidates in each z band the human confirmed.
// `medium` should sit at the knee; `high` should mark a band that is nearly always right.
const BANDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, Number.POSITIVE_INFINITY];
console.log(`\nagreement by z band (current cuts: medium>=${CONFIDENCE_MEDIUM_Z}, high>=${CONFIDENCE_HIGH_Z}):`);
for (let i = 0; i < BANDS.length - 1; i++) {
  const lo = BANDS[i];
  const hi = BANDS[i + 1];
  const inB = pairs.filter((p) => p.z >= lo && p.z < hi);
  if (inB.length === 0) continue;
  const agreed = inB.filter((p) => p.hit).length;
  const mark = lo === CONFIDENCE_MEDIUM_Z ? "  ← medium" : lo === CONFIDENCE_HIGH_Z ? "  ← high" : "";
  console.log(
    `  ${lo.toFixed(2)}–${hi === Number.POSITIVE_INFINITY ? "  ∞" : hi.toFixed(2)}  n=${String(inB.length).padStart(4)}  agreed ${String(agreed).padStart(4)}   ${((agreed / inB.length) * 100).toFixed(0)}%${mark}`,
  );
}

// Precision/recall of the SURFACING decision alone, swept over candidate cuts.
console.log("\nif the surfacing cut moved (prefilter only — judge would still reject some):");
console.log("  cut     surfaced  correct   precision   recall-of-249");
for (const cut of [1.0, 1.25, 1.5, 1.75, 2.0]) {
  const s = pairs.filter((p) => p.z >= cut);
  const ok = s.filter((p) => p.hit).length;
  console.log(
    `  ${cut.toFixed(2)}  ${String(s.length).padStart(8)}  ${String(ok).padStart(7)}   ${((ok / (s.length || 1)) * 100).toFixed(0).padStart(8)}%   ${((ok / truth) * 100).toFixed(0).padStart(12)}%`,
  );
}
