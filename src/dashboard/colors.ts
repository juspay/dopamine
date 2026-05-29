/**
 * 12-category color maps lifted from src/agents/dashboard.ts catColor/catBg.
 * Used by the data builder to populate facets.categories color/bg fields.
 */

const COLOR_MAP: Record<string, string> = {
  "Tech & Coding": "#d5e8f5",
  "AI & Machine Learning": "#e8d5f5",
  "UI/UX Design": "#f5d5e8",
  "Business & Marketing": "#d5f5e0",
  "Education": "#f5f5d5",
  "Finance": "#d5f5f0",
  "Interior Design & Home": "#f5e8d5",
  "Food & Cooking": "#f5d5d5",
  "Travel & Lifestyle": "#f0d5f5",
  "Fitness & Health": "#e0f5d5",
  "Entertainment & Comedy": "#f5e8e0",
  "Other": "#ddd",
};

const BG_MAP: Record<string, string> = {
  "Tech & Coding": "#1f2d3d",
  "AI & Machine Learning": "#2d1f3d",
  "UI/UX Design": "#3d1f2d",
  "Business & Marketing": "#1f3d2d",
  "Education": "#3d3d1f",
  "Finance": "#1f3d3a",
  "Interior Design & Home": "#3d2d1f",
  "Food & Cooking": "#3d1f1f",
  "Travel & Lifestyle": "#351f3d",
  "Fitness & Health": "#2a3d1f",
  "Entertainment & Comedy": "#3d2e25",
  "Other": "#333",
};

export function catColor(cat: string): string {
  return COLOR_MAP[cat] ?? "#ccc";
}

export function catBg(cat: string): string {
  return BG_MAP[cat] ?? "#333";
}
