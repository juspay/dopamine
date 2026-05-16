// Mark all analysis entries with 0 actionable_items for re-run.
// Most of these dropped items due to model non-determinism; reanalyze will recover.
const fs = require("fs");
const a = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));
let marked = 0;
for (const [k, v] of Object.entries(a)) {
  if ((v?.actionable_items?.length ?? 0) === 0) {
    v.error = "FORCE_REANALYZE_EMPTY_ITEMS";
    marked++;
  }
}
fs.writeFileSync("videos/analysis.json", JSON.stringify(a, null, 2));
console.log("Marked", marked, "empty-analysis entries for re-run");
