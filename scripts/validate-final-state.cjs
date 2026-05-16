// Final validation — checks that the post-cascade state is internally consistent.
const fs = require("fs");

const cat = JSON.parse(fs.readFileSync("videos/catalog.json", "utf8"));
const c   = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));
const kb  = JSON.parse(fs.readFileSync("videos/knowledge_base.json", "utf8"));
const a   = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));
const r   = JSON.parse(fs.readFileSync("videos/research.json", "utf8"));
const v   = JSON.parse(fs.readFileSync("videos/verifications.json", "utf8"));

const CATEGORIES = new Set([
  "Tech & Coding", "AI & Machine Learning", "UI/UX Design",
  "Business & Marketing", "Education", "Finance",
  "Interior Design & Home", "Food & Cooking", "Travel & Lifestyle",
  "Fitness & Health", "Entertainment & Comedy", "Other",
]);

let errors = 0;

console.log("\n=== 1. Category enum compliance ===");
const badCats = new Set();
for (const [k, e] of Object.entries(c)) {
  if (e?.category && !CATEGORIES.has(e.category)) badCats.add(e.category);
}
if (badCats.size > 0) {
  console.log("  FAIL — invalid categories:", [...badCats]);
  errors++;
} else {
  console.log("  PASS — all categories from canonical enum");
}

console.log("\n=== 2. Category sync (classifications -> kb, analysis) ===");
let kbMismatch = 0, aMismatch = 0;
for (const [k, e] of Object.entries(c)) {
  const newCat = e?.category;
  if (kb[k] && kb[k].category !== newCat) kbMismatch++;
  if (a[k] && a[k].category !== newCat) aMismatch++;
}
console.log("  KB cached category mismatches:", kbMismatch, kbMismatch === 0 ? "PASS" : "FAIL");
console.log("  Analysis cached category mismatches:", aMismatch, aMismatch === 0 ? "PASS" : "FAIL");
if (kbMismatch + aMismatch > 0) errors++;

console.log("\n=== 3. Coverage ===");
const counts = {
  metadata: 376,
  classifications: Object.keys(c).length,
  knowledge_base: Object.keys(kb).length,
  analysis: Object.keys(a).length,
  research: Object.keys(r).length,
  verifications: Object.keys(v).length,
};
for (const [k, n] of Object.entries(counts)) console.log("  " + k + ":", n);

console.log("\n=== 4. Verification distribution ===");
const verStatus = {};
const confs = [];
for (const e of Object.values(v)) {
  const s = e?.overall_score || "missing";
  verStatus[s] = (verStatus[s] || 0) + 1;
  if (typeof e?.confidence === "number") confs.push(e.confidence);
}
for (const [k, n] of Object.entries(verStatus).sort((a,b) => b[1]-a[1])) {
  console.log("  " + n + " " + k);
}
const mean = confs.reduce((a, b) => a + b, 0) / confs.length;
console.log("  Mean confidence: " + mean.toFixed(2) + "/10");

console.log("\n=== 5. Category distribution ===");
const cats = {};
for (const e of Object.values(c)) cats[e?.category || "?"] = (cats[e?.category || "?"] || 0) + 1;
for (const [k, n] of Object.entries(cats).sort((a,b) => b[1]-a[1])) {
  console.log("  " + n.toString().padStart(3) + " " + k);
}

console.log("\n=== 6. Sample 5 verified-useful entries ===");
const useful = Object.entries(v)
  .filter(([_, e]) => e?.overall_score === "verified_useful")
  .slice(0, 5);
for (const [k, e] of useful) {
  console.log("\n  ---", k.slice(0, 60));
  console.log("  score:", e.overall_score, "conf:", e.confidence);
  console.log("  summary:", (e.summary || "").slice(0, 200));
}

console.log("\n=== TOTAL ERRORS:", errors, "===");
process.exit(errors > 0 ? 1 : 0);
