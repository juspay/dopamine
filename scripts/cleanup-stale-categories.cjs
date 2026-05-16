// Delete stale category folders/symlinks in knowledge_base/ and videos/classified/
// that no longer match the new canonical category enum.
const fs = require("fs");
const path = require("path");

const CATEGORIES = new Set([
  "Tech & Coding",
  "AI & Machine Learning",
  "UI/UX Design",
  "Business & Marketing",
  "Education",
  "Finance",
  "Interior Design & Home",
  "Food & Cooking",
  "Travel & Lifestyle",
  "Fitness & Health",
  "Entertainment & Comedy",
  "Other",
]);

// Mirrors markdown.ts sanitizeDirname: strip everything not [\w\s\-&], then spaces -> underscores.
function sanitize(name) {
  return name.replace(/[^\w\s\-&]/g, "").trim().replace(/\s+/g, "_");
}
const VALID_FOLDERS = new Set([...CATEGORIES].map(sanitize));

function cleanup(rootDir) {
  if (!fs.existsSync(rootDir)) {
    console.log("  (not found):", rootDir);
    return;
  }
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!VALID_FOLDERS.has(e.name)) {
      const target = path.join(rootDir, e.name);
      console.log("  REMOVE:", target);
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      console.log("  KEEP:  ", path.join(rootDir, e.name));
    }
  }
}

console.log("=== knowledge_base/ ===");
cleanup("knowledge_base");

// videos/classified/ uses literal category names (with spaces, &, etc.)
const VALID_CLASSIFIED = new Set(
  [...CATEGORIES].map(c => c.replace(/\//g, "-"))
);
console.log("\n=== videos/classified/ ===");
const classifiedDir = "videos/classified";
if (fs.existsSync(classifiedDir)) {
  for (const e of fs.readdirSync(classifiedDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (!VALID_CLASSIFIED.has(e.name)) {
      const target = path.join(classifiedDir, e.name);
      console.log("  REMOVE:", target);
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      console.log("  KEEP:  ", path.join(classifiedDir, e.name));
    }
  }
}
