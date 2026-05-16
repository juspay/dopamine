const fs = require("fs");
const before = JSON.parse(fs.readFileSync("videos/analysis.bak.before-empty-rerun.json", "utf8"));
const after = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));

let recovered = 0, stillZero = 0, totalNewItems = 0;
const recoveredList = [];
for (const [k, b] of Object.entries(before)) {
  const aft = after[k];
  if (!aft) continue;
  const beforeItems = b?.actionable_items?.length ?? 0;
  const afterItems = aft?.actionable_items?.length ?? 0;
  if (beforeItems === 0 && afterItems > 0) {
    recovered++;
    totalNewItems += afterItems;
    recoveredList.push({ file: k, items: afterItems, cat: aft.category });
  } else if (beforeItems === 0 && afterItems === 0) {
    stillZero++;
  }
}

console.log("Of the 57 marked entries:");
console.log("  Recovered (now have items):", recovered);
console.log("  Still zero items:", stillZero);
console.log("  Total new actionable items unlocked:", totalNewItems);

// Show categories of recovered
const byCat = {};
for (const r of recoveredList) byCat[r.cat] = (byCat[r.cat] ?? 0) + 1;
console.log("\nRecovered by category:");
for (const [c, n] of Object.entries(byCat).sort((a,b) => b[1] - a[1])) {
  console.log("  " + n + " " + c);
}

console.log("\nTop 5 recoveries by item count:");
recoveredList.sort((a, b) => b.items - a.items);
for (const r of recoveredList.slice(0, 5)) {
  console.log("  " + r.items + " items: " + r.file + " (" + r.cat + ")");
}
