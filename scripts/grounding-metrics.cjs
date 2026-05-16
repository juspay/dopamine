// Before/after metrics: research empty rate, hallucination leak, verification confidence.
const fs = require("fs");

function load(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

const before = {
  research: load("videos/research.backup.before-grounding-fix.json"),
  verif:    load("videos/verifications.backup.before-grounding-fix.json"),
};
const after = {
  research: load("videos/research.json"),
  verif:    load("videos/verifications.json"),
};

const HALLU = /Examining the (Query|Tools)|I am (now|focused|currently|starting)|I am pinpointed|I'm (focused|now|currently|investigating|digging|looking)|Generated image|Vertex AI/i;

function classify(text) {
  const t = (text || "").trim();
  if (!t || t === "No research data available." || t.length < 50) return "empty";
  if (HALLU.test(t)) return "hallucination";
  return "useful";
}

function summarize(snapshot, label) {
  const buckets = { empty: 0, hallucination: 0, useful: 0 };
  let totalItems = 0, totalEntries = 0, withErrors = 0;
  for (const [, e] of Object.entries(snapshot.research)) {
    totalEntries++;
    if (e.error) withErrors++;
    if (!e.items) continue;
    for (const item of e.items) {
      totalItems++;
      buckets[classify(item.web_research)]++;
    }
  }
  console.log(`\n${label}`);
  console.log(`  Entries: ${totalEntries}  Items: ${totalItems}  Entries-with-error: ${withErrors}`);
  console.log(`  Research items by quality:`);
  console.log(`    useful:        ${buckets.useful} (${((buckets.useful/totalItems)*100).toFixed(1)}%)`);
  console.log(`    empty:         ${buckets.empty} (${((buckets.empty/totalItems)*100).toFixed(1)}%)`);
  console.log(`    hallucination: ${buckets.hallucination} (${((buckets.hallucination/totalItems)*100).toFixed(1)}%)`);

  const verifs = Object.values(snapshot.verif);
  const conf = verifs.map(v => v.confidence ?? 0);
  const avgConf = conf.reduce((a,b)=>a+b,0) / conf.length;
  const distrib = { ge8: 0, "5to7": 0, "1to4": 0, zero: 0 };
  for (const c of conf) {
    if (c >= 8) distrib.ge8++;
    else if (c >= 5) distrib["5to7"]++;
    else if (c >= 1) distrib["1to4"]++;
    else distrib.zero++;
  }
  const overall = {};
  for (const v of verifs) {
    const o = v.overall_score ?? "unknown";
    overall[o] = (overall[o] || 0) + 1;
  }
  console.log(`  Verification confidence (avg): ${avgConf.toFixed(2)}/10`);
  console.log(`    >=8 high:    ${distrib.ge8}`);
  console.log(`    5-7 mid:     ${distrib["5to7"]}`);
  console.log(`    1-4 low:     ${distrib["1to4"]}`);
  console.log(`    0 nothing:   ${distrib.zero}`);
  console.log(`  overall_score breakdown:`);
  for (const [k, c] of Object.entries(overall)) console.log(`    ${k}: ${c}`);
  return { buckets, totalItems, avgConf };
}

const a = summarize(before, "BEFORE (original research + old verifications)");
const b = summarize(after,  "AFTER  (grounded research + new verifications)");

console.log("\n" + "=".repeat(60));
console.log("DELTA");
console.log("=".repeat(60));
const usefulDelta = b.buckets.useful - a.buckets.useful;
const emptyDelta = b.buckets.empty - a.buckets.empty;
const halluDelta = b.buckets.hallucination - a.buckets.hallucination;
console.log(`useful:        ${a.buckets.useful} -> ${b.buckets.useful}  (${usefulDelta >= 0 ? "+" : ""}${usefulDelta})`);
console.log(`empty:         ${a.buckets.empty} -> ${b.buckets.empty}  (${emptyDelta >= 0 ? "+" : ""}${emptyDelta})`);
console.log(`hallucination: ${a.buckets.hallucination} -> ${b.buckets.hallucination}  (${halluDelta >= 0 ? "+" : ""}${halluDelta})`);
console.log(`avg verification confidence: ${a.avgConf.toFixed(2)} -> ${b.avgConf.toFixed(2)}  (${(b.avgConf - a.avgConf).toFixed(2)})`);
