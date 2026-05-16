// Sync the new category from classifications.json into the cached `category`
// fields in knowledge_base.json and analysis.json. Without this, downstream
// outputs (markdown, dashboard, verifier prompts) would still see the old
// category strings.
const fs = require("fs");

const c   = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));
const kb  = JSON.parse(fs.readFileSync("videos/knowledge_base.json", "utf8"));
const a   = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));

let kbUpdated = 0, aUpdated = 0, missing = 0;
for (const [filename, classified] of Object.entries(c)) {
  const newCat = classified?.category;
  if (!newCat) { missing++; continue; }
  if (kb[filename] && kb[filename].category !== newCat) {
    kb[filename].category = newCat;
    kbUpdated++;
  }
  if (a[filename] && a[filename].category !== newCat) {
    a[filename].category = newCat;
    aUpdated++;
  }
}

fs.writeFileSync("videos/knowledge_base.json", JSON.stringify(kb, null, 2));
fs.writeFileSync("videos/analysis.json", JSON.stringify(a, null, 2));

console.log("Category sync complete:");
console.log("  KB entries updated:    ", kbUpdated);
console.log("  Analysis entries updated:", aUpdated);
console.log("  Missing category:      ", missing);
