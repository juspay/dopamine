/**
 * Related-videos algorithm.
 * Pure, deterministic — no I/O.
 */

export interface RelInput {
  id: string;
  tags: string[];
  topics: string[];
  category: string;
  username: string;
  toolUrls: string[];
  date: string;
}

export function computeRelated(all: RelInput[], k = 8): Map<string, string[]> {
  const norm = (s: string): string => s.toLowerCase().trim();
  const out = new Map<string, string[]>();
  for (const a of all) {
    const aT = new Set(a.tags.map(norm));
    const aTo = new Set(a.topics.map(norm));
    const aU = new Set(a.toolUrls);
    const scored: { id: string; score: number; date: string }[] = [];
    for (const b of all) {
      if (b.id === a.id) continue;
      let s = 0;
      for (const t of b.tags) if (aT.has(norm(t))) s += 3;
      for (const t of b.topics) if (aTo.has(norm(t))) s += 2;
      if (a.category && b.category === a.category) s += 2;
      if (a.username && b.username === a.username) s += 1;
      for (const u of b.toolUrls) if (aU.has(u)) s += 1;
      if (s > 0) scored.push({ id: b.id, score: s, date: b.date || "" });
    }
    scored.sort((x, y) => y.score - x.score || y.date.localeCompare(x.date));
    out.set(a.id, scored.slice(0, k).map((z) => z.id));
  }
  return out;
}
