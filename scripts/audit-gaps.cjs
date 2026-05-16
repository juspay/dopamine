const fs = require("fs");
const kb = JSON.parse(fs.readFileSync("videos/knowledge_base.json", "utf8"));
const a = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));
const r = JSON.parse(fs.readFileSync("videos/research.json", "utf8"));
const v = JSON.parse(fs.readFileSync("videos/verifications.json", "utf8"));
const c = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));

const kbSet = new Set(Object.keys(kb));
const aSet = new Set(Object.keys(a));
const rSet = new Set(Object.keys(r));
const vSet = new Set(Object.keys(v));

console.log("Counts: classifications=" + Object.keys(c).length, "kb=" + kbSet.size, "analysis=" + aSet.size, "research=" + rSet.size, "verifications=" + vSet.size);

const inKbNotResearch = [...kbSet].filter(f => !rSet.has(f));
console.log("\nIn KB but NOT in research:", inKbNotResearch.length);

const missingButAnalyzed = inKbNotResearch.filter(f => aSet.has(f));
console.log("  ...of which analyzed:", missingButAnalyzed.length);

const withItems = missingButAnalyzed.filter(f => (a[f]?.actionable_items?.length ?? 0) > 0);
console.log("  ...of which have actionable_items > 0:", withItems.length);

const withoutItems = missingButAnalyzed.filter(f => (a[f]?.actionable_items?.length ?? 0) === 0);
console.log("  ...of which have 0 actionable_items:", withoutItems.length);

console.log("\nSample entries that SHOULD have research but don't (have items, missing research):");
for (const f of withItems.slice(0, 10)) {
  console.log("  -", f);
  console.log("    category:", a[f].category, " items:", a[f].actionable_items.length);
  console.log("    first item:", a[f].actionable_items[0]?.name);
}

// Also check the reverse — items with actionable_items count breakdown
console.log("\nBreakdown of all analyzed entries by actionable_items count:");
const distribution = {};
for (const f of aSet) {
  const n = a[f]?.actionable_items?.length ?? 0;
  distribution[n] = (distribution[n] ?? 0) + 1;
}
for (const [n, c] of Object.entries(distribution).sort((a,b) => +a[0] - +b[0])) {
  console.log(`  ${n} items: ${c} entries`);
}

// Today's new video — find which filename
console.log("\nNewest video properties (last entries):");
const p = JSON.parse(fs.readFileSync("videos/video_properties.json", "utf8"));
const props = Object.entries(p);
console.log("Total properties:", props.length);

// Show what category the new video might be in. Recent classifications
const classEntries = Object.entries(c);
const recent = classEntries.slice(-5);
console.log("\nLast 5 classifications:");
for (const [f, cls] of recent) console.log("  ", f, "->", cls.category);
