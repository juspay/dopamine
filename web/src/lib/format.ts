/**
 * Pure formatting utilities and category/verification colour maps.
 * No side effects; no Svelte imports.
 */

// ── Duration ──────────────────────────────────────────────────────────────

/**
 * Convert seconds to "mm:ss" or "h:mm:ss".
 */
export function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return `${m}:${String(ss).padStart(2, '0')}`;
}

// ── Date ──────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string to a human-readable short form: "May 29, 2026".
 */
export function fmtDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Number ────────────────────────────────────────────────────────────────

/**
 * Compact number: 1234 → "1.2k", 1200000 → "1.2M", < 1000 → "999".
 */
export function fmtNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

// ── Category colours — canonical 12-category map ─────────────────────────

// Canonical 12-category map — MUST match src/dashboard/colors.ts (which feeds facets.json).
const CAT_COLOR: Record<string, string> = {
  'Tech & Coding': '#d5e8f5',
  'AI & Machine Learning': '#e8d5f5',
  'UI/UX Design': '#f5d5e8',
  'Business & Marketing': '#d5f5e0',
  'Education': '#f5f5d5',
  'Finance': '#d5f5f0',
  'Interior Design & Home': '#f5e8d5',
  'Food & Cooking': '#f5d5d5',
  'Travel & Lifestyle': '#f0d5f5',
  'Fitness & Health': '#e0f5d5',
  'Entertainment & Comedy': '#f5e8e0',
  'Other': '#ddd'
};

const CAT_BG: Record<string, string> = {
  'Tech & Coding': '#1f2d3d',
  'AI & Machine Learning': '#2d1f3d',
  'UI/UX Design': '#3d1f2d',
  'Business & Marketing': '#1f3d2d',
  'Education': '#3d3d1f',
  'Finance': '#1f3d3a',
  'Interior Design & Home': '#3d2d1f',
  'Food & Cooking': '#3d1f1f',
  'Travel & Lifestyle': '#351f3d',
  'Fitness & Health': '#2a3d1f',
  'Entertainment & Comedy': '#3d2e25',
  'Other': '#333'
};

const DEFAULT_COLOR = '#9aa3ad';
const DEFAULT_BG = 'rgba(154,163,173,0.12)';

export function catColor(cat: string): string {
  return CAT_COLOR[cat] ?? DEFAULT_COLOR;
}

export function catBg(cat: string): string {
  return CAT_BG[cat] ?? DEFAULT_BG;
}

// ── Instagram reel URL ─────────────────────────────────────────────────────

export function igUrl(code: string): string {
  if (!code) return '';
  return `https://instagram.com/reel/${encodeURIComponent(code)}/`;
}

// ── Verification ───────────────────────────────────────────────────────────

const VERIF_LABEL: Record<string, string> = {
  verified_useful: 'Verified',
  partially_verified: 'Partial',
  not_verified: 'Unverified',
  outdated: 'Outdated',
  not_verifiable: 'Not verifiable',
  unknown: 'Not analysed'
};

const VERIF_COLOR: Record<string, string> = {
  verified_useful: 'var(--ok)',
  partially_verified: 'var(--warn)',
  not_verified: 'var(--neutral)',
  outdated: 'var(--bad)',
  not_verifiable: 'var(--neutral)',
  unknown: 'var(--neutral)'
};

export function verifLabel(score: string): string {
  return VERIF_LABEL[score] ?? score;
}

export function verifColor(score: string): string {
  return VERIF_COLOR[score] ?? 'var(--neutral)';
}
