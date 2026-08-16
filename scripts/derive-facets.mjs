// Derive a project's facets from the videos the human confirmed for it.
//
// Held-out testing established that facets need no authored prose: k-means
// centroids of a train fold reached 92% of held-out pairs vs 75% for a single
// vector, and auto-derived text matched my hand-written facets to within one
// pair. So the clusters carry the signal; this turns each cluster into the one
// sentence describing it, because projects.json stores TEXT.
//
// CAUTION: adding facets is not automatically good. A previous extension to
// Shooter/Dopamine/Yama raised prefilter reach 94→96% while END-TO-END F1 fell
// 68→64%. Anything this produces must be validated with the real judge.
//
// SPLIT=train|test|all controls which labels may be used (held-out derivation).
// ONLY=A,B restricts to named projects.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NeuroLink } from "@juspay/neurolink";

const R = path.resolve(import.meta.dirname, "..");
const { projectBaselines } = await import(`${R}/dist/agents/project-mapper.js`);
const { blobToVector } = await import(`${R}/dist/search/db.js`);
const { cosineSim } = await import(`${R}/dist/search/rank.js`);
const { loadProjects, projectFacets } = await import(`${R}/dist/schemas/projects.js`);

const SPLIT = process.env.SPLIT ?? "all";
const ONLY = (process.env.ONLY ?? "").split(",").filter(Boolean);
const OUT = process.env.OUT ?? `${R}/videos/facets.bak.json`;
const MIN_LABELS = Number.parseInt(process.env.MIN_LABELS ?? "8", 10);

const projects = loadProjects(() => fs.readFileSync(`${R}/projects.json`, "utf8"));
const labels = JSON.parse(fs.readFileSync(`${R}/videos/labels.json`, "utf8")).labels ?? {};
const triage = JSON.parse(fs.readFileSync(`${R}/videos/triage.json`, "utf8"));
const APPLY = new Set(["apply-now", "evaluate-later"]);

const db = new DatabaseSync(`${R}/videos/search.db`, { readonly: true });
const rows = db
  .prepare(
    "SELECT v.id, v.title, v.topics_json, e.vector FROM videos v JOIN embeddings e ON e.video_id=v.id WHERE e.model=?",
  )
  .all("gemini-embedding-001");
db.close();
const byId = new Map();
for (const r of rows) {
  if (!APPLY.has((triage[r.id] ?? {}).tier)) continue;
  byId.set(r.id, {
    id: r.id,
    title: r.title ?? "",
    topics: JSON.parse(r.topics_json ?? "[]"),
    vector: blobToVector(r.vector),
  });
}
const labelled = Object.keys(labels)
  .filter((id) => byId.has(id))
  .sort();
const allowed = new Set(SPLIT === "all" ? labelled : labelled.filter((_, i) => (i % 2 === 0) === (SPLIT === "train")));

const mean = (vs) => {
  const o = new Float32Array(vs[0].length);
  for (const v of vs) for (let i = 0; i < v.length; i++) o[i] += v[i];
  for (let i = 0; i < o.length; i++) o[i] /= vs.length;
  return o;
};

/**
 * Capacity-constrained k-means, deterministic (no RNG so reruns are identical).
 * Plain k-means degenerates here: unconstrained assignment once put 24 of
 * Curator's 26 confirmed videos in ONE cluster with two singletons, recreating
 * the very centroid problem facets exist to fix. Sizes are capped at 1.5x the
 * even split; greedy assignment in descending-similarity order gives each point
 * its best cluster that still has room.
 */
function balancedKmeans(items, k, iters = 25) {
  if (items.length <= k) return items.map((it) => [it]);
  const cap = Math.ceil((items.length / k) * 1.5);
  const centers = [mean(items.map((it) => it.vector))];
  while (centers.length < k) {
    let far = null;
    let worst = Number.POSITIVE_INFINITY;
    for (const it of items) {
      const best = Math.max(...centers.map((c) => cosineSim(it.vector, c)));
      if (best < worst) {
        worst = best;
        far = it.vector;
      }
    }
    centers.push(far);
  }
  let buckets = [];
  for (let iter = 0; iter < iters; iter++) {
    const pairs = [];
    for (let pi = 0; pi < items.length; pi++)
      for (let ci = 0; ci < centers.length; ci++) pairs.push([cosineSim(items[pi].vector, centers[ci]), pi, ci]);
    pairs.sort((a, b) => b[0] - a[0] || a[1] - b[1] || a[2] - b[2]);
    buckets = centers.map(() => []);
    const taken = new Set();
    for (const [, pi, ci] of pairs) {
      if (taken.has(pi) || buckets[ci].length >= cap) continue;
      buckets[ci].push(items[pi]);
      taken.add(pi);
    }
    for (let pi = 0; pi < items.length; pi++) {
      if (taken.has(pi)) continue;
      let bi = 0,
        bs = -2;
      for (let ci = 0; ci < centers.length; ci++) {
        const s = cosineSim(items[pi].vector, centers[ci]);
        if (s > bs) {
          bs = s;
          bi = ci;
        }
      }
      buckets[bi].push(items[pi]);
    }
    for (let ci = 0; ci < centers.length; ci++)
      if (buckets[ci].length) centers[ci] = mean(buckets[ci].map((x) => x.vector));
  }
  return buckets.filter((b) => b.length);
}

const neurolink = new NeuroLink();
async function describe(project, cluster) {
  const lines = cluster
    .slice(0, 12)
    .map((v) => `- ${v.title.slice(0, 160)}${v.topics.length ? ` [${v.topics.slice(0, 6).join(", ")}]` : ""}`)
    .join("\n");
  const prompt = [
    `Project: ${project.name}`,
    `What it is: ${project.description}`,
    "",
    "Below is a cluster of learnings a human confirmed DO apply to this project.",
    "They were grouped by similarity, so they share one reason for applying.",
    "",
    lines,
    "",
    "Write ONE sentence naming that shared reason, as a retrieval description:",
    "start with a short label, then a colon, then the concrete vocabulary a similar",
    "learning would use (techniques, tool categories, artefacts). Name the SUBJECT",
    "MATTER these learnings are about, not the project and not the fact that they",
    "were grouped. No preamble, no project name, no quotes. Under 45 words.",
  ].join("\n");
  const res = await neurolink.generate({
    input: { text: prompt },
    provider: "vertex",
    model: process.env.MAP_MODEL ?? "gemini-2.5-flash",
    disableTools: true,
    maxTokens: 2048,
    timeout: "120s",
  });
  return String(res.content ?? "")
    .trim()
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ");
}

const norm = (s) => String(s).toLowerCase();
const out = {};
for (const p of projects) {
  if (ONLY.length && !ONLY.includes(p.name)) {
    const existing = projectFacets(p)
      .slice(1)
      .map((f) => f.text.replace(new RegExp(`^${p.name}\\. `), ""));
    if (existing.length) out[p.name] = existing; // preserve what is already shipped
    continue;
  }
  const confirmed = [...allowed]
    .filter((id) => (labels[id].projects ?? []).some((x) => norm(x) === norm(p.name)))
    .map((id) => byId.get(id));
  if (confirmed.length < MIN_LABELS) {
    console.log(
      `${p.name.padEnd(11)} ${String(confirmed.length).padStart(3)} confirmed — below ${MIN_LABELS}, single doc only`,
    );
    continue;
  }
  const k = Math.max(2, Math.min(6, Math.round(confirmed.length / 5)));
  const clusters = balancedKmeans(confirmed, k);
  const facets = [];
  for (const c of clusters) facets.push(await describe(p, c));
  out[p.name] = facets;
  console.log(
    `${p.name.padEnd(11)} ${String(confirmed.length).padStart(3)} confirmed → ${clusters.length} facets (sizes ${clusters.map((c) => c.length).join("/")})`,
  );
  for (const f of facets) console.log(`    · ${f.slice(0, 145)}`);
}
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nwrote ${OUT} (SPLIT=${SPLIT}, ${allowed.size} labels)`);
