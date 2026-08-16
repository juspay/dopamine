// End-to-end judge evaluation — the thing I failed to do last time.
//
// Scores real precision/recall/F1 by actually running the judge, not a prefilter
// proxy. Reach went UP while F1 went DOWN on the last change because the proxy
// does not model what the judge accepts; nothing here is decided without a real
// judge call.
//
// Arms are evaluated HELD OUT where they use labels: few-shot examples come from
// the train fold and are only ever scored on the test fold.
//
// Reads private, gitignored inputs and makes paid model calls, so it never runs
// in CI. See docs/eval-harness.md before running it.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NeuroLink } from "@juspay/neurolink";

const R = path.resolve(import.meta.dirname, "..");
const mapper = await import(`${R}/dist/agents/project-mapper.js`);
const { prefilterScored, projectBaselines, parseJudgement, judgePrompt, confidenceFromScore } = mapper;
const { blobToVector } = await import(`${R}/dist/search/db.js`);
const { cosineSim } = await import(`${R}/dist/search/rank.js`);
const { loadProjects, projectFacets } = await import(`${R}/dist/schemas/projects.js`);
const { MapJudgeSchema } = await import(`${R}/dist/schemas/mapping.js`);
const { safeJsonParse } = await import(`${R}/dist/utils/json-repair.js`);

const ARM = process.env.ARM ?? "baseline";
const TAG = process.env.TAG ?? ARM;
const TOPK = 6;
const FLOOR = 0.5;
const CONCURRENCY = 6;

const projects = loadProjects(() => fs.readFileSync(process.env.PROJECTS ?? `${R}/projects.json`, "utf8"));
const labels = JSON.parse(fs.readFileSync(`${R}/videos/labels.json`, "utf8")).labels ?? {};
const triage = JSON.parse(fs.readFileSync(`${R}/videos/triage.json`, "utf8"));
const APPLY = new Set(["apply-now", "evaluate-later"]);

const db = new DatabaseSync(`${R}/videos/search.db`, { readonly: true });
const rows = db
  .prepare(
    "SELECT v.id, v.title, v.takeaways_json, e.vector FROM videos v JOIN embeddings e ON e.video_id=v.id WHERE e.model=?",
  )
  .all("gemini-embedding-001");
const toolStmt = db.prepare("SELECT name FROM tools WHERE video_id = ? LIMIT 5");
const all = rows.map((r) => ({
  id: r.id,
  title: r.title ?? "",
  takeaways: JSON.parse(r.takeaways_json ?? "[]"),
  toolNames: toolStmt.all(r.id).map((t) => t.name),
  vector: blobToVector(r.vector),
}));
db.close();
const eligible = all.filter((v) => APPLY.has((triage[v.id] ?? {}).tier));
const byId = new Map(eligible.map((v) => [v.id, v]));

const neurolink = new NeuroLink();
const provider = await (await import(`${R}/node_modules/@juspay/neurolink/dist/index.js`)).createAIProvider("vertex");

const projectVecs = [];
for (const p of projects) {
  for (const f of projectFacets(p)) {
    projectVecs.push({
      key: f.key,
      project: f.project,
      vector: Float32Array.from(await provider.embed(f.text, "gemini-embedding-001")),
    });
  }
}
const baselines = projectBaselines(
  eligible.map((v) => v.vector),
  projectVecs,
);

const norm = (s) => String(s).toLowerCase();
const labelled = Object.keys(labels)
  .filter((id) => byId.has(id))
  .sort();
const folds = { f0: labelled.filter((_, i) => i % 2 === 0), f1: labelled.filter((_, i) => i % 2 === 1) };

/** z of one video against one project — the same score the prefilter ranks on. */
function zFor(videoId, projectName) {
  const v = byId.get(videoId);
  let best = Number.NEGATIVE_INFINITY;
  for (const pv of projectVecs) {
    if (norm(pv.project) !== norm(projectName)) continue;
    const b = baselines[pv.key];
    const sim = cosineSim(v.vector, pv.vector);
    const z = b && b.sd > 0 ? (sim - b.mean) / b.sd : sim;
    if (z > best) best = z;
  }
  return best;
}

/**
 * Confirmed / rejected titles for one project, drawn ONLY from `trainIds`.
 *
 * Negatives are the HARD ones: videos this project scores highest on that the
 * human still rejected. Random negatives are almost all obviously unrelated and
 * teach nothing — the whole difficulty is that accepted and rejected learnings
 * here are phrased identically ("adopt open-source agent framework X"), so the
 * boundary is only visible in near misses.
 */
function examples(projectName, trainIds, n = 6, opts = {}) {
  const { rich = false, mixed = false } = opts;
  const yes = [];
  const no = [];
  for (const id of trainIds) {
    const v = byId.get(id);
    const title = (v.title ?? "").slice(0, 110);
    if (!title) continue;
    const t = rich && v.takeaways[0] ? `${title}\n         ↳ ${String(v.takeaways[0]).slice(0, 130)}` : title;
    const row = { t, z: zFor(id, projectName) };
    // A "no" is only evidence when the human reviewed this video and did NOT
    // name the project — an unreviewed video says nothing either way.
    ((labels[id].projects ?? []).some((p) => norm(p) === norm(projectName)) ? yes : no).push(row);
  }
  const byZ = (xs) => [...xs].sort((a, b) => b.z - a.z);
  // Negatives stay hard (highest-scoring rejections) — that is the boundary.
  const negs = byZ(no)
    .slice(0, n)
    .map((x) => x.t);
  // Positives: v1 took only the highest-scoring, i.e. the OBVIOUS accepts, which
  // taught the judge nothing about saying yes to a weak-looking match — the most
  // likely cause of v1's recall drop. Half now come from the bottom of the
  // ranking: learnings accepted DESPITE not looking like an obvious fit.
  const sorted = byZ(yes);
  const pos = mixed
    ? [...sorted.slice(0, Math.ceil(n / 2)), ...sorted.slice(-Math.floor(n / 2))].map((x) => x.t)
    : sorted.slice(0, n).map((x) => x.t);
  return { yes: [...new Set(pos)], no: negs, accepted: yes.length, reviewed: yes.length + no.length };
}

/** ARM: stricter — adds a reject rule for peer-product inspiration. */
function strictPrompt(video, cands) {
  const base = judgePrompt(video, cands);
  return base.replace(
    "REJECT (applies=false) when the only link is:",
    [
      "REJECT (applies=false) when the learning is a RIVAL of this project — another product in",
      "the same category — and the link is that the maintainer could be inspired by how it works.",
      "'Project X could adopt rival Y's approach' is NOT applicability; it is competitor analysis.",
      "Applicability means the project would DEPEND ON the thing: install it, call it, wrap it, or",
      "change a decision because of it. If the project would have to REBUILD the idea rather than",
      "USE the artifact, answer false.",
      "",
      "REJECT (applies=false) when the only link is:",
    ].join("\n"),
  );
}

/**
 * ARM: fewshot — shows the judge this human's own accepted/rejected examples.
 *
 * v1 (rich=false, mixed=false, rate=false) bought precision with recall:
 * P 66→73%, R 68→63%. v2 adds the three things most likely to have cost that
 * recall — takeaways so examples are as thick as the video being judged, hard
 * POSITIVES as well as hard negatives, and (v3) the project's real accept rate,
 * since a flat 6/6 implies a 50% base rate that is wrong for most projects.
 */
function fewshotPrompt(video, cands, trainIds, opts = {}) {
  const { rich = false, mixed = false, rate = false, n = 6 } = opts;
  const base = judgePrompt(video, cands);
  const blocks = cands
    .map((p) => {
      const { yes, no, accepted, reviewed } = examples(p.name, trainIds, n, { rich, mixed });
      if (yes.length === 0 && no.length === 0) return "";
      const head = rate
        ? `${p.name} — the maintainer accepted ${accepted} of ${reviewed} reviewed learnings for this project.`
        : `${p.name}:`;
      return [
        head,
        "  ACCEPTED:",
        ...yes.map((t) => `    YES: ${t}`),
        "  REJECTED:",
        ...no.map((t) => `    NO:  ${t}`),
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
  if (!blocks) return base;
  return [
    base,
    "",
    "CALIBRATION — the maintainer's own past verdicts on other learnings.",
    "These are the ground truth for where each bar actually sits. Some rejected examples will",
    "look superficially similar to accepted ones; infer the real distinction and apply it.",
    mixed
      ? "The accepted examples deliberately include ones that do NOT look like an obvious fit — the bar is not 'obviously related', and matching that leniency matters as much as matching the strictness."
      : "",
    "",
    blocks,
  ]
    .filter((x) => x !== "")
    .join("\n");
}

async function judge(prompt) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        model: process.env.MAP_MODEL ?? "gemini-2.5-flash",
        schema: MapJudgeSchema,
        output: { format: "json" },
        disableTools: true,
        maxTokens: 4096,
        timeout: "120s",
      });
      // safeJsonParse returns the VALUE, not a {success,value} wrapper — that
      // wrapper belongs to exponentialBackoff, which production wraps around it.
      const parsed = safeJsonParse(res.content);
      if (parsed && Array.isArray(parsed.results)) return parsed;
      console.error(`  unexpected shape (attempt ${attempt}): ${JSON.stringify(parsed).slice(0, 200)}`);
    } catch (err) {
      console.error(`  judge threw (attempt ${attempt}): ${String(err).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return null;
}

const mappings = {};
let done = 0;
async function runOne(id, trainIds) {
  const v = byId.get(id);
  const scored = prefilterScored(v.vector, projectVecs, TOPK, FLOOR, baselines);
  if (scored.length === 0) {
    mappings[id] = [];
    return;
  }
  const names = scored.map((c) => c.name);
  const cands = projects.filter((p) => names.includes(p.name));
  const FEWSHOT = {
    fewshot: {},
    fewshot2: { rich: true, mixed: true },
    fewshot3: { rich: true, mixed: true, rate: true },
    fewshot4: { rich: true, mixed: true, rate: true, n: 8 },
  };
  const prompt =
    ARM === "strict"
      ? strictPrompt(v, cands)
      : ARM in FEWSHOT
        ? fewshotPrompt(v, cands, trainIds, FEWSHOT[ARM])
        : judgePrompt(v, cands);
  const out = await judge(prompt);
  mappings[id] =
    out === null ? [] : parseJudgement(out, names, Object.fromEntries(scored.map((c) => [c.name, c.score])));
  done++;
  if (done % 25 === 0) console.error(`  …${done} judged`);
}

// Each fold is judged with few-shot drawn from the OTHER fold, so no arm ever
// sees the labels of the video it is judging.
const LIMIT = Number.parseInt(process.env.LIMIT ?? "0", 10);
for (const testFold of ["f0", "f1"]) {
  const trainIds = folds[testFold === "f0" ? "f1" : "f0"];
  const queue = LIMIT ? folds[testFold].slice(0, LIMIT) : [...folds[testFold]];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const id = queue.shift();
      if (id === undefined) return;
      await runOne(id, trainIds);
    }
  });
  await Promise.all(workers);
}

// Score only what was actually judged — with LIMIT set, the rest are absent, not
// missed, and counting them as false negatives would make every arm look broken.
const judgedIds = labelled.filter((id) => id in mappings);
function score(filter) {
  let tp = 0,
    fp = 0,
    fn = 0;
  const per = {};
  const bump = (p, k) => {
    per[p] = per[p] ?? { tp: 0, fp: 0, fn: 0 };
    per[p][k]++;
  };
  for (const id of judgedIds) {
    const human = new Set(labels[id].projects ?? []);
    const pipe = new Set((mappings[id] ?? []).filter(filter).map((x) => x.project));
    for (const p of pipe) {
      if (human.has(p)) {
        tp++;
        bump(p, "tp");
      } else {
        fp++;
        bump(p, "fp");
      }
    }
    for (const p of human)
      if (!pipe.has(p)) {
        fn++;
        bump(p, "fn");
      }
  }
  const pr = tp / (tp + fp || 1),
    rc = tp / (tp + fn || 1);
  return { tp, fp, fn, pr, rc, f1: (2 * pr * rc) / (pr + rc || 1), per };
}

const surfaced = score((x) => x.confidence !== "low");
const allm = score(() => true);
const line = (t, s) =>
  `${t.padEnd(22)} P=${(s.pr * 100).toFixed(0)}% R=${(s.rc * 100).toFixed(0)}% F1=${(s.f1 * 100).toFixed(0)}%  (tp${s.tp} fp${s.fp} fn${s.fn})`;
console.log(`\n===== ARM ${TAG} — ${judgedIds.length} videos judged =====`);
console.log(line("ALL mappings", allm));
console.log(line("SURFACED (med+high)", surfaced));
for (const p of Object.keys(surfaced.per).sort()) {
  const x = surfaced.per[p];
  console.log(
    `   ${p.padEnd(10)} tp${String(x.tp).padStart(3)} fp${String(x.fp).padStart(3)} fn${String(x.fn).padStart(3)}`,
  );
}
fs.writeFileSync(
  `${R}/videos/judge-eval.${TAG}.bak.json`,
  JSON.stringify({ arm: TAG, mappings, surfaced, allm }, null, 2),
);
console.log(`\nwrote videos/judge-eval.${TAG}.bak.json`);
