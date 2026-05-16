// Mark every verification entry with `error` so they re-run after research is fixed.
const fs = require("fs");
const path = "videos/verifications.json";
const v = JSON.parse(fs.readFileSync(path, "utf8"));
let n = 0;
for (const k of Object.keys(v)) {
  v[k].error = "FORCE_RERUN_AFTER_GROUNDED_RESEARCH";
  n++;
}
fs.writeFileSync(path, JSON.stringify(v, null, 2));
console.log("Marked", n, "verification entries for re-run");
