/**
 * Human labels — the only signal in this dashboard the pipeline did not
 * generate about itself. Loaded once, mutated optimistically, persisted through
 * the dashboard server's /api/labels endpoints.
 *
 * Optimistic on purpose: labelling is a rapid, repetitive pass, and a UI that
 * waits for a round-trip before showing the chip as selected makes that pass
 * miserable. A failed save rolls the entry back and surfaces the error rather
 * than leaving a verdict that looks saved and is not.
 */

import type { Label, LabelPatch, LabelsFile } from './types.js';

let labels = $state<Record<string, Label>>({});
let loaded = $state(false);
let error = $state<string | null>(null);
let saving = $state(0);

let _loadPromise: Promise<void> | null = null;

export function loadLabels(): Promise<void> {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const res = await fetch('/api/labels');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const file = (await res.json()) as LabelsFile;
      labels = file.labels ?? {};
    } catch (e) {
      // A dashboard opened from a plain static host has no API. Labelling is
      // simply unavailable there; everything else on the page still works.
      error = `Labels unavailable: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      loaded = true;
    }
  })();
  return _loadPromise;
}

/** Reactive: read inside $derived to track. */
export function getLabel(id: string): Label | undefined {
  return labels[id];
}
export function getAllLabels(): Record<string, Label> {
  return labels;
}
export function labelsLoaded(): boolean {
  return loaded;
}
export function labelsError(): string | null {
  return error;
}
export function isSaving(): boolean {
  return saving > 0;
}

const EMPTY: Label = { projects: [], tags: [], verdict: 'applies', note: '', updatedAt: '' };

/** Merge a patch locally, then persist. Rolls back on failure. */
export async function patchLabel(id: string, patch: LabelPatch): Promise<void> {
  const before = labels[id];
  const optimistic: Label = {
    ...(before ?? EMPTY),
    ...patch,
    updatedAt: new Date().toISOString()
  };
  labels = { ...labels, [id]: optimistic };
  saving++;
  error = null;
  try {
    const res = await fetch(`/api/labels/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { label } = (await res.json()) as { label: Label | null };
    // Trust the server's version: it strips empty labels and stamps the time.
    if (label) {
      labels = { ...labels, [id]: label };
    } else {
      const { [id]: _gone, ...rest } = labels;
      labels = rest;
    }
  } catch (e) {
    if (before) labels = { ...labels, [id]: before };
    else {
      const { [id]: _gone, ...rest } = labels;
      labels = rest;
    }
    error = `Save failed: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    saving--;
  }
}

export function toggleProject(id: string, project: string): Promise<void> {
  const current = labels[id]?.projects ?? [];
  const next = current.includes(project) ? current.filter((p) => p !== project) : [...current, project];
  // Selecting a project is itself an "applies" verdict — otherwise a row marked
  // "none" and then given a project would keep contradicting itself.
  return patchLabel(id, { projects: next, ...(next.length ? { verdict: 'applies' as const } : {}) });
}

export function setVerdict(id: string, verdict: 'applies' | 'none'): Promise<void> {
  // "none" means it applies nowhere; keeping a project list alongside would be
  // a contradiction stored as data.
  return patchLabel(id, verdict === 'none' ? { verdict, projects: [] } : { verdict });
}

export function setTags(id: string, tags: string[]): Promise<void> {
  return patchLabel(id, { tags });
}

export function setNote(id: string, note: string): Promise<void> {
  return patchLabel(id, { note });
}

/** Has a human actually ruled on this one? */
export function isReviewed(id: string): boolean {
  const l = labels[id];
  if (!l) return false;
  return l.verdict === 'none' || l.projects.length > 0 || l.tags.length > 0 || l.note.trim() !== '';
}
