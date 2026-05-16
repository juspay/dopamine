const fs = require("fs");
const kb = JSON.parse(fs.readFileSync("videos/knowledge_base.json", "utf8"));
const a = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));
const c = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));

// Find 5 entries that have 0 actionable_items but DO have transcript/visual content
const empties = Object.entries(a).filter(([f, x]) => (x?.actionable_items?.length ?? 0) === 0);
console.log("Total analyzed entries with 0 items:", empties.length);

// Categories of empty entries
const byCategory = {};
for (const [f, x] of empties) {
  const cat = c[f]?.category || "?";
  byCategory[cat] = (byCategory[cat] ?? 0) + 1;
}
console.log("\nEmpty-analysis distribution by category:");
const sorted = Object.entries(byCategory).sort((a,b) => b[1] - a[1]);
for (const [k, v] of sorted) console.log("  ", v, k);

// Show the ones in Tech & Coding / AI & Machine Learning — those SHOULD have items
console.log("\n=== Empty analyses in actionable categories ===");
const targetCats = new Set(["Tech & Coding", "AI & Machine Learning", "Business & Marketing", "UI/UX Design"]);
let shown = 0;
for (const [f, x] of empties) {
  const cat = c[f]?.category || "?";
  if (!targetCats.has(cat)) continue;
  const kbe = kb[f];
  console.log("\n---", f, "(", cat, ") ---");
  console.log("transcript len:", (kbe?.transcript || "").length);
  console.log("visual_description len:", (kbe?.visual_description || "").length);
  console.log("links count:", kbe?.links_and_resources?.length || 0);
  console.log("topics:", JSON.stringify(kbe?.topics?.slice(0, 5) ?? []));
  console.log("key_takeaways:", JSON.stringify(kbe?.key_takeaways?.slice(0, 3) ?? []));
  console.log("transcript preview:", (kbe?.transcript || "").slice(0, 200));
  console.log("analysis.error?:", a[f]?.error || "(none)");
  console.log("analysis.implementability_score:", a[f]?.implementability_score);
  console.log("analysis.usefulness_prediction:", a[f]?.usefulness_prediction);
  if (++shown >= 6) break;
}
