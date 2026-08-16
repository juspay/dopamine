// Build a BLIND re-review sheet to measure the human's self-agreement.
//
// Every accuracy number in this project scores the pipeline against labels.json
// as if those labels were exact. Nobody has measured how exact they are. If the
// maintainer re-reviewing the same video disagrees with their own past verdict
// 25% of the time, then a 72%-precision pipeline is already at the ceiling and
// eight failed tuning experiments were failing against noise, not a bad lever.
//
// Fairness rules this encodes:
//  - SAME TASK. The original labelling was recognition over the surfaced
//    candidates, not free recall. So each video is re-served with a candidate
//    list, never an open-ended "which projects apply?".
//  - CANDIDATES = surfaced ∪ confirmed. A project the human confirmed but that
//    the mapper no longer surfaces must still be offerable, or agreement is
//    depressed by a portfolio change rather than by the human.
//  - BLIND. No prior verdict is written into the sheet, and option order is
//    shuffled per video so position memory carries no signal.
//  - OLD LABELS ONLY. Sampled from the oldest cohort to blunt recall.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const R = path.resolve(import.meta.dirname, "..");
const N = Number.parseInt(process.env.N ?? "30", 10);
const BEFORE = process.env.BEFORE ?? "2026-08-05";

const labels = JSON.parse(fs.readFileSync(`${R}/videos/labels.json`, "utf8")).labels ?? {};
const mapRaw = JSON.parse(fs.readFileSync(`${R}/videos/project_mappings.json`, "utf8"));
const mappings = mapRaw.mappings ?? mapRaw;

const db = new DatabaseSync(`${R}/videos/search.db`, { readonly: true });
const rows = db.prepare("SELECT id, title, takeaways_json, topics_json FROM videos").all();
db.close();
const meta = new Map(rows.map((r) => [r.id, r]));

// Deterministic PRNG so a rebuild produces the identical sheet — a reshuffled
// sheet would not be comparable to a partially-completed one.
function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const shuffle = (xs, seed) => {
  const r = rng(seed);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pool = Object.keys(labels)
  .filter((id) => (labels[id].updatedAt ?? "") < BEFORE)
  .filter((id) => meta.has(id))
  .filter((id) => {
    const cands = new Set([
      ...(mappings[id] ?? []).filter((x) => x.confidence !== "low").map((x) => x.project),
      ...(labels[id].projects ?? []),
    ]);
    return cands.size > 0; // a video with nothing to tick measures nothing
  })
  .sort();

// Stratify by how many projects the human confirmed, so the sheet is not all
// easy single-project videos. Multi-project calls are where disagreement lives.
const strata = {};
for (const id of pool) (strata[(labels[id].projects ?? []).length] ??= []).push(id);
const picked = [];
const keys = Object.keys(strata).sort();
for (let round = 0; picked.length < Math.min(N, pool.length); round++) {
  for (const k of keys) {
    const bucket = shuffle(strata[k], `stratum-${k}`);
    if (round < bucket.length && picked.length < N) picked.push(bucket[round]);
  }
}

const items = picked.map((id) => {
  const m = meta.get(id);
  const confirmed = labels[id].projects ?? [];
  const surfaced = (mappings[id] ?? []).filter((x) => x.confidence !== "low").map((x) => x.project);
  const cands = [...new Set([...surfaced, ...confirmed])];
  return {
    id,
    title: (m.title ?? "").replace(/\s+/g, " ").trim(),
    takeaways: JSON.parse(m.takeaways_json ?? "[]").slice(0, 4),
    topics: JSON.parse(m.topics_json ?? "[]").slice(0, 8),
    candidates: shuffle(cands, `cand-${id}`),
  };
});

fs.writeFileSync(
  `${R}/videos/relabel-truth.bak.json`,
  `${JSON.stringify(Object.fromEntries(picked.map((id) => [id, labels[id].projects ?? []])), null, 2)}\n`,
);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cards = items
  .map(
    (v, i) => `<article class="card" data-id="${esc(v.id)}">
  <header><span class="num">${i + 1}<span class="of">/${items.length}</span></span>
    <h2>${esc(v.title) || "(untitled)"}</h2></header>
  ${v.takeaways.length ? `<ul class="take">${v.takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
  ${v.topics.length ? `<p class="topics">${v.topics.map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : ""}
  <fieldset><legend>Which of these does this learning actually apply to?</legend>
    ${v.candidates.map((c) => `<label><input type="checkbox" value="${esc(c)}"><span>${esc(c)}</span></label>`).join("")}
    <label class="none"><input type="checkbox" value="__none__"><span>None of them</span></label>
  </fieldset>
</article>`,
  )
  .join("\n");

fs.writeFileSync(
  `${R}/videos/relabel.bak.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blind re-review — ${items.length} videos</title>
<style>
:root{--bg:#0e1013;--panel:#161a20;--line:#252b34;--ink:#e6e9ee;--dim:#8b95a4;--acc:#6ee7a8;--warn:#f0b47a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 ui-sans-serif,-apple-system,"SF Pro Text",system-ui,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px 160px}
h1{font-size:1.5rem;margin:0 0 6px;letter-spacing:-.01em}
.lede{color:var(--dim);margin:0 0 28px;font-size:.94rem}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:16px}
.card header{display:flex;gap:12px;align-items:baseline}
.num{color:var(--dim);font-variant-numeric:tabular-nums;font-size:.8rem;flex:0 0 auto;padding-top:2px}
.of{opacity:.55}
h2{font-size:1.02rem;font-weight:600;margin:0 0 10px;line-height:1.35}
.take{margin:6px 0 10px;padding-left:18px;color:#c3cad4;font-size:.9rem}
.take li{margin:3px 0}
.topics{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.topics span{font-size:.72rem;color:var(--dim);border:1px solid var(--line);border-radius:999px;padding:2px 9px}
fieldset{border:0;border-top:1px solid var(--line);margin:0;padding:12px 0 0;display:flex;flex-wrap:wrap;gap:8px}
legend{color:var(--dim);font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;padding:0 8px 0 0}
label{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:8px;padding:7px 12px;cursor:pointer;font-size:.9rem;user-select:none}
label:hover{border-color:#3a434f}
label:has(input:checked){border-color:var(--acc);background:rgba(110,231,168,.09);color:var(--acc)}
label.none:has(input:checked){border-color:var(--warn);background:rgba(240,180,122,.09);color:var(--warn)}
input{accent-color:var(--acc);margin:0}
.card.done{border-color:#2e3a33}
.bar{position:fixed;left:0;right:0;bottom:0;background:rgba(14,16,19,.94);backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:14px 20px}
.bar .in{max-width:760px;margin:0 auto;display:flex;gap:14px;align-items:center}
.count{font-variant-numeric:tabular-nums;color:var(--dim);font-size:.88rem;flex:1}
button{background:var(--acc);color:#08130d;border:0;border-radius:8px;padding:10px 18px;font-weight:650;font-size:.9rem;cursor:pointer}
button:disabled{background:#2a3038;color:var(--dim);cursor:not-allowed}
textarea{width:100%;max-width:760px;margin:12px auto 0;display:block;height:90px;background:#0b0d10;color:var(--acc);border:1px solid var(--line);border-radius:8px;padding:10px;font:12px ui-monospace,monospace}
</style></head><body><div class="wrap">
<h1>Blind re-review</h1>
<p class="lede">${items.length} videos you labelled 10+ days ago, served without your previous verdict and with the options reshuffled. Answer as you would today. There is no right answer being checked against — this measures how much you agree with <em>yourself</em>, which sets the ceiling on how accurate the pipeline can ever be scored as.</p>
${cards}
</div>
<div class="bar"><div class="in">
  <span class="count" id="count">0 / ${items.length} answered</span>
  <button id="copy" disabled>Copy result</button>
</div><textarea id="out" readonly placeholder="Finish all ${items.length}, then click Copy result and paste it back to Claude."></textarea></div>
<script>
const cards=[...document.querySelectorAll('.card')];
const out=document.getElementById('out'),btn=document.getElementById('copy'),cnt=document.getElementById('count');
function sync(){
  let done=0;const res={};
  for(const c of cards){
    const boxes=[...c.querySelectorAll('input')];
    const on=boxes.filter(b=>b.checked);
    const none=on.some(b=>b.value==='__none__');
    if(none) for(const b of on) if(b.value!=='__none__') b.checked=false;
    const picks=[...c.querySelectorAll('input:checked')].filter(b=>b.value!=='__none__').map(b=>b.value);
    const answered=none||picks.length>0;
    c.classList.toggle('done',answered);
    if(answered){done++;res[c.dataset.id]=picks;}
  }
  cnt.textContent=done+' / '+cards.length+' answered';
  const all=done===cards.length;btn.disabled=!all;
  out.value=all?JSON.stringify(res):'';
}
document.addEventListener('change',e=>{if(e.target.matches('input'))sync();});
btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(out.value);btn.textContent='Copied';setTimeout(()=>btn.textContent='Copy result',1400);}catch{out.select();}});
sync();
</script></body></html>
`,
);

console.log(`sheet: ${items.length} videos, ${items.reduce((s, v) => s + v.candidates.length, 0)} candidate decisions`);
const dist = {};
for (const id of picked) dist[(labels[id].projects ?? []).length] = (dist[(labels[id].projects ?? []).length] ?? 0) + 1;
console.log(`confirmed-count strata: ${JSON.stringify(dist)}`);
console.log(`oldest label: ${picked.map((i) => labels[i].updatedAt).sort()[0]}`);
console.log(`wrote videos/relabel.bak.html and videos/relabel-truth.bak.json`);
