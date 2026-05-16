// Delete .md files in knowledge_base that are in the WRONG category folder
// (i.e. don't match the current classifications.json category for that file).
const fs = require("fs");
const path = require("path");

function sanitize(name) {
  return name.replace(/[^\w\s\-&]/g, "").trim().replace(/\s+/g, "_");
}

const c = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));

// Build filename(.mp4) -> expected folder
const expected = new Map();
for (const [filename, entry] of Object.entries(c)) {
  if (!entry?.category) continue;
  const folder = sanitize(entry.category);
  // mp4 -> md basename
  const mdName = filename.replace(/\.mp4$/, ".md");
  expected.set(mdName, folder);
}

const root = "knowledge_base";
const cats = fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
let removed = 0;
const survivors = new Set();
for (const cat of cats) {
  const dir = path.join(root, cat);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const want = expected.get(f);
    if (!want) {
      // No classification for this file — orphan, delete
      const p = path.join(dir, f);
      fs.unlinkSync(p);
      removed++;
      console.log("  ORPHAN:", p);
      continue;
    }
    if (want !== cat) {
      const p = path.join(dir, f);
      fs.unlinkSync(p);
      removed++;
      console.log("  STALE:", p, "(should be in", want + ")");
      continue;
    }
    survivors.add(f);
  }
}
console.log("\nStale removed:", removed);
console.log("Surviving md files:", survivors.size);
