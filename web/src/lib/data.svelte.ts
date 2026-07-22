/**
 * Client data access layer — fetch + cache static JSON from /data/*.
 * Runes module (.svelte.ts): index/facets/tools are reactive $state, so any
 * component reading them via the getters updates automatically once data loads.
 * All fetches happen in the browser at runtime (SPA, no SSR).
 */

import type { IndexFile, IndexRecord, VideoDetail, Facets, ToolRecord, Briefs } from './types.js';

// ── Reactive state ──────────────────────────────────────────────────────────
let index = $state<IndexFile | null>(null);
let facets = $state<Facets | null>(null);
let tools = $state<ToolRecord[] | null>(null);
let briefs = $state<Briefs | null>(null);

// ── In-flight de-dup ──────────────────────────────────────────────────────
let _indexPromise: Promise<IndexFile | null> | null = null;
let _facetsPromise: Promise<Facets | null> | null = null;
let _briefsPromise: Promise<Briefs> | null = null;
let _toolsPromise: Promise<ToolRecord[]> | null = null;
const _detailCache = new Map<string, VideoDetail | null>();
const _detailPromises = new Map<string, Promise<VideoDetail | null>>();

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Index ───────────────────────────────────────────────────────────────────
export function loadIndex(): Promise<IndexFile | null> {
  if (index) return Promise.resolve(index);
  if (_indexPromise) return _indexPromise;
  _indexPromise = fetchJson<IndexFile>('/data/index.json').then((d) => {
    if (d) index = d;
    return index;
  });
  return _indexPromise;
}

/** Reactive: all index records (empty until loaded). Read inside $derived to track. */
export function getVideos(): IndexRecord[] {
  return index?.videos ?? [];
}

/** Reactive: whether the index has finished loading. */
export function isIndexLoaded(): boolean {
  return index !== null;
}

/** Reactive lookup by id (updates once the index loads). */
export function getById(id: string): IndexRecord | undefined {
  return index?.videos.find((v) => v.id === id);
}

// ── Facets ────────────────────────────────────────────────────────────────
export function loadFacets(): Promise<Facets | null> {
  if (facets) return Promise.resolve(facets);
  if (_facetsPromise) return _facetsPromise;
  _facetsPromise = fetchJson<Facets>('/data/facets.json').then((d) => {
    if (d) facets = d;
    return facets;
  });
  return _facetsPromise;
}

/** Reactive facets accessor. */
export function getFacets(): Facets | null {
  return facets;
}

// ── Tools ─────────────────────────────────────────────────────────────────
export function loadTools(): Promise<ToolRecord[]> {
  if (tools) return Promise.resolve(tools);
  if (_toolsPromise) return _toolsPromise;
  _toolsPromise = fetchJson<ToolRecord[]>('/data/tools.json').then((d) => {
    tools = d ?? [];
    return tools;
  });
  return _toolsPromise;
}

/** Reactive tools accessor. */
export function getTools(): ToolRecord[] {
  return tools ?? [];
}

// ── Briefs ────────────────────────────────────────────────────────────────
export function loadBriefs(): Promise<Briefs> {
  if (briefs) return Promise.resolve(briefs);
  if (_briefsPromise) return _briefsPromise;
  _briefsPromise = fetchJson<Briefs>('/data/briefs.json').then((d) => {
    const b = d ?? {}; // absent file (feature not built yet) → empty, not an error
    briefs = b;
    return b;
  });
  return _briefsPromise;
}

/** Reactive briefs accessor (project name → actions). */
export function getBriefs(): Briefs {
  return briefs ?? {};
}

// ── Per-video detail ────────────────────────────────────────────────────────
export function loadDetail(id: string): Promise<VideoDetail | null> {
  if (_detailCache.has(id)) return Promise.resolve(_detailCache.get(id) ?? null);
  const existing = _detailPromises.get(id);
  if (existing) return existing;
  const p = fetchJson<VideoDetail>(`/data/video/${encodeURIComponent(id)}.json`).then((d) => {
    _detailCache.set(id, d);
    return d;
  });
  _detailPromises.set(id, p);
  return p;
}
