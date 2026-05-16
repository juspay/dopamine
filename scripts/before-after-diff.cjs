// Snapshot the BEFORE numbers, then after cascade run this again to show diff.
// Usage: node scripts/before-after-diff.cjs snapshot   -> saves /tmp/dopamine-snapshot.json
//        node scripts/before-after-diff.cjs compare    -> compares current vs snapshot
const fs = require("fs");

function gather() {
  const c   = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));
  const a   = JSON.parse(fs.readFileSync("videos/analysis.json", "utf8"));
  const v   = JSON.parse(fs.readFileSync("videos/verifications.json", "utf8"));
  const r   = JSON.parse(fs.readFileSync("videos/research.json", "utf8"));

  const cats = {};
  for (const e of Object.values(c)) cats[e?.category || "?"] = (cats[e?.category || "?"] || 0) + 1;

  const verScores = {};
  const confs = [];
  for (const e of Object.values(v)) {
    verScores[e?.overall_score || "missing"] = (verScores[e?.overall_score || "missing"] || 0) + 1;
    if (typeof e?.confidence === "number") confs.push(e.confidence);
  }
  const meanConf = confs.reduce((a, b) => a + b, 0) / Math.max(1, confs.length);

  const urlStatus = {};
  for (const e of Object.values(r)) for (const it of (e.items || [])) {
    urlStatus[it.url_status || "?"] = (urlStatus[it.url_status || "?"] || 0) + 1;
  }

  let analysisItems = 0, emptyAnalysis = 0;
  for (const e of Object.values(a)) {
    const n = e?.actionable_items?.length || 0;
    analysisItems += n;
    if (n === 0) emptyAnalysis++;
  }

  return {
    timestamp: new Date().toISOString(),
    counts: {
      classifications: Object.keys(c).length,
      analysis: Object.keys(a).length,
      research: Object.keys(r).length,
      verifications: Object.keys(v).length,
      uniqueCategories: Object.keys(cats).length,
      analysisItems,
      emptyAnalysis,
    },
    categoryDistribution: cats,
    verificationScores: verScores,
    meanConfidence: meanConf,
    urlStatus,
  };
}

const cmd = process.argv[2] || "compare";
if (cmd === "snapshot") {
  const data = gather();
  fs.writeFileSync("/tmp/dopamine-snapshot.json", JSON.stringify(data, null, 2));
  console.log("Snapshot saved. Categories:", data.counts.uniqueCategories);
  console.log("Verification distribution:", data.verificationScores);
  console.log("Mean confidence:", data.meanConfidence.toFixed(2));
} else if (cmd === "compare") {
  const before = JSON.parse(fs.readFileSync("/tmp/dopamine-snapshot.json", "utf8"));
  const after = gather();
  console.log("=== BEFORE vs AFTER ===");
  console.log("\nCategory count:", before.counts.uniqueCategories, "->", after.counts.uniqueCategories);
  console.log("Analysis items: ", before.counts.analysisItems, "->", after.counts.analysisItems);
  console.log("Empty analysis:", before.counts.emptyAnalysis, "->", after.counts.emptyAnalysis);
  console.log("Mean confidence:", before.meanConfidence.toFixed(2), "->", after.meanConfidence.toFixed(2));
  console.log("\nVerification scores:");
  const allScores = new Set([...Object.keys(before.verificationScores), ...Object.keys(after.verificationScores)]);
  for (const s of allScores) {
    const b = before.verificationScores[s] || 0;
    const a = after.verificationScores[s] || 0;
    const delta = a - b;
    console.log("  " + s.padEnd(25) + " " + String(b).padStart(4) + " -> " + String(a).padStart(4) + (delta !== 0 ? "  (" + (delta > 0 ? "+" : "") + delta + ")" : ""));
  }
  console.log("\nCategory distribution (after):");
  for (const [k, n] of Object.entries(after.categoryDistribution).sort((a, b) => b[1] - a[1])) {
    console.log("  " + String(n).padStart(3) + " " + k);
  }
}
