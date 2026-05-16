// Deterministically map sprawled categories to canonical 12-category enum,
// using the OLD classifications.bak as the source for entries not yet re-classified.
// This avoids waiting ~40 min for the classifier to re-process all 364.
const fs = require("fs");

const CATEGORIES = new Set([
  "Tech & Coding", "AI & Machine Learning", "UI/UX Design",
  "Business & Marketing", "Education", "Finance",
  "Interior Design & Home", "Food & Cooking", "Travel & Lifestyle",
  "Fitness & Health", "Entertainment & Comedy", "Other",
]);

// Hand-curated map from observed 34 sprawled categories -> canonical
const MAP = {
  // Tech
  "Tech & Coding": "Tech & Coding",
  "Tech & Gadgets": "Tech & Coding",
  // AI
  "AI & Machine Learning": "AI & Machine Learning",
  // UI/UX
  "UI/UX Design": "UI/UX Design",
  // Business
  "Business & Marketing": "Business & Marketing",
  // Education
  "Education": "Education",
  // Finance
  "Finance": "Finance",
  "Finance & Investing": "Finance",
  // Interior
  "Interior Design": "Interior Design & Home",
  "Home & Garden": "Interior Design & Home",
  "Home Improvement & DIY": "Interior Design & Home",
  "DIY & Crafts": "Interior Design & Home",
  "Art & Crafts": "Interior Design & Home",
  // Food
  "Food & Cooking": "Food & Cooking",
  "Food & Drink": "Food & Cooking",
  // Travel
  "Travel & Lifestyle": "Travel & Lifestyle",
  "Travel & Adventure": "Travel & Lifestyle",
  "Travel & Events": "Travel & Lifestyle",
  "Travel & Local": "Travel & Lifestyle",
  "Travel & Living": "Travel & Lifestyle",
  "Travel": "Travel & Lifestyle",
  "Lifestyle": "Travel & Lifestyle",
  "Outdoor & Nature": "Travel & Lifestyle",
  // Fitness
  "Fitness & Health": "Fitness & Health",
  "Parenting": "Fitness & Health",
  // Entertainment
  "Anime & Entertainment": "Entertainment & Comedy",
  "Comedy & Humor": "Entertainment & Comedy",
  "Comedy": "Entertainment & Comedy",
  "Entertainment": "Entertainment & Comedy",
  "Entertainment & Pop Culture": "Entertainment & Comedy",
  "Entertainment & Media": "Entertainment & Comedy",
  // Other / catch-all
  "News & Information": "Other",
  "Cars & Transportation": "Other",
  "Trades & Craftsmanship": "Other",
};

const current = JSON.parse(fs.readFileSync("videos/classifications.json", "utf8"));
const old     = JSON.parse(fs.readFileSync("videos/classifications.bak.before-enum.json", "utf8"));

let mapped = 0, alreadyDone = 0, unmapped = 0;
const unmappedSet = new Set();

for (const filename of Object.keys(old)) {
  const cur = current[filename];
  // If already classified by new classifier with a canonical category, keep it
  if (cur?.category && CATEGORIES.has(cur.category)) {
    alreadyDone++;
    continue;
  }

  // Otherwise, map from old classification
  const oldCat = old[filename]?.category;
  const newCat = MAP[oldCat] || "Other";
  if (!MAP[oldCat] && oldCat) unmappedSet.add(oldCat);

  current[filename] = {
    ...(old[filename] || {}),
    ...(current[filename] || {}),
    category: newCat,
    pk: old[filename]?.pk ?? null,
    code: old[filename]?.code ?? null,
    username: old[filename]?.username ?? null,
  };
  mapped++;
}

fs.writeFileSync("videos/classifications.json", JSON.stringify(current, null, 2));

console.log("Normalize done:");
console.log("  Already classified by new run:", alreadyDone);
console.log("  Mapped from old:              ", mapped);
console.log("  Unmapped (fallback -> Other): ", unmappedSet.size);
if (unmappedSet.size > 0) {
  console.log("  Unmapped categories:", [...unmappedSet]);
}

// Sanity: verify all entries have a canonical category
let bad = 0;
for (const [k, v] of Object.entries(current)) {
  if (!v.category || !CATEGORIES.has(v.category)) bad++;
}
console.log("  Entries with invalid category:", bad);
