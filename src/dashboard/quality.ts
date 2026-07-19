// Quality scoring for surfacing learnings best-first instead of newest-first.
//
// The corpus is dominated by generic content and a thin tail of unprocessed
// videos. Sorting by recency puts whatever was saved last at the top —
// frequently a low-content card. These pure helpers rank a learning by how
// genuinely useful and applicable it is, so the dashboard can lead with signal
// and demote the empties. Kept dependency-free and deterministic so it is
// trivially testable and reproducible across builds.

export type Tier = "featured" | "standard" | "thin";

export interface QualityInput {
  verification: string;
  usefulness: string;
  confidence: number; // 0-10, from the verifier
  implementability: number; // 0-10, from the analyzer
  appliesTo: string[]; // projects this learning maps to (medium+ confidence)
  tags: string[];
  likes: number;
}

// Verification ladder — how much the claims in the learning were substantiated.
const VERIF_POINTS: Record<string, number> = {
  verified_useful: 22,
  partially_verified: 12,
  not_verified: 4,
  outdated: 2,
  not_verifiable: 0,
  unknown: 0,
};

// Predicted usefulness ladder — the analyzer's read on whether it's worth acting on.
const USEFUL_POINTS: Record<string, number> = {
  highly_useful: 18,
  useful: 11,
  somewhat_useful: 5,
  not_useful: 0,
  unknown: 0,
};

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x < 0) return 0;
  return x > 1 ? 1 : x;
}

/**
 * A deterministic 0–~100 quality score. Applicability to the user's own
 * projects is weighted highest (that's the whole point of the capture→apply
 * loop), followed by verification and predicted usefulness, then how actionable
 * and how confidently extracted the learning is. Social proof (likes) is capped
 * at ~2 points so a viral-but-empty clip can never float to the top.
 */
export function qualityScore(v: QualityInput): number {
  let score = 0;

  if (v.appliesTo.length > 0) score += 25 + Math.min(v.appliesTo.length, 3) * 3;

  score += VERIF_POINTS[v.verification] ?? 0;
  score += USEFUL_POINTS[v.usefulness] ?? 0;

  score += clamp01(v.implementability / 10) * 12;
  score += clamp01(v.confidence / 10) * 8;

  if (v.tags.length >= 2) score += 4;
  else if (v.tags.length === 1) score += 2;

  // Floor at 1 so fractional/zero/negative likes contribute 0 (never negative)
  // and cap the top so a viral clip adds at most ~2 points.
  const likes = Number.isFinite(v.likes) && v.likes >= 1 ? v.likes : 1;
  score += Math.min(Math.log10(likes) / 5, 1) * 2;

  return Math.round(score);
}

/**
 * Coarse bucket used for surfacing decisions.
 *  - `thin`: extraction produced essentially nothing worth showing (no
 *    verifiable content, no predicted usefulness, no tags) — demote/hide.
 *  - `featured`: maps to a real project, or is verified AND highly useful.
 *  - `standard`: everything else.
 * A `not_verifiable` learning that is still highly useful (a conceptual/mindset
 * clip with no links to verify) is deliberately NOT thin.
 */
export function tierOf(v: QualityInput): Tier {
  // Applicability to a real project is the strongest signal — it is judged from
  // real takeaways, so a mapped learning is never thin. Check it first.
  if (v.appliesTo.length > 0) return "featured";

  // Thin means the extraction produced nothing worth surfacing. That requires
  // ALL of the emptiness signals — no predicted usefulness, no tags, nothing
  // actionable, and nothing substantiated. `confidence` and `implementability`
  // come from independent stages (verifier vs analyzer), so a low confidence
  // alone must NOT demote a highly-implementable learning to thin.
  const weakUsefulness = v.usefulness === "" || v.usefulness === "not_useful" || v.usefulness === "unknown";
  const noTags = v.tags.length === 0;
  const notActionable = !(v.implementability > 0);
  const unsubstantiated = v.verification === "not_verifiable" || v.confidence === 0;
  if (weakUsefulness && noTags && notActionable && unsubstantiated) return "thin";

  if (v.verification === "verified_useful" && v.usefulness === "highly_useful") return "featured";
  return "standard";
}
