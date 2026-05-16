const fs = require("fs");
const a = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));
const kb = JSON.parse(fs.readFileSync("videos/knowledge_base.json", "utf8"));
const c = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));

// All still-empty entries
const empties = Object.entries(a).filter(([f, x]) => (x?.actionable_items?.length ?? 0) === 0);
console.log("Still empty:", empties.length);

const byCategory = {};
for (const [f, x] of empties) {
  const cat = c[f]?.category || "?";
  byCategory[cat] = (byCategory[cat] ?? 0) + 1;
}
console.log("\nBy category:");
for (const [k, v] of Object.entries(byCategory).sort((a,b) => b[1] - a[1])) console.log("  " + v + " " + k);

const targetCats = new Set(["Tech & Coding", "AI & Machine Learning", "Business & Marketing", "UI/UX Design"]);
console.log("\n=== Still-empty in TECH categories — should these have items? ===");
for (const [f, x] of empties) {
  const cat = c[f]?.category || "?";
  if (!targetCats.has(cat)) continue;
  const kbe = kb[f];
  console.log("\n---", f, "(", cat, ") ---");
  console.log("transcript:", JSON.stringify((kbe?.transcript || "").slice(0, 250)));
  console.log("visual_desc:", JSON.stringify((kbe?.visual_description || "").slice(0, 250)));
  console.log("links:", JSON.stringify(kbe?.links_and_resources?.slice(0, 3) ?? []));
}
