/**
 * Client data access layer — fetch + cache static JSON from /data/*
 * All fetches happen in the browser at runtime (SPA, no SSR).
 */

import type { IndexFile, IndexRecord, VideoDetail, Facets, ToolRecord } from './types.js';

// ── Module-level singletons ────────────────────────────────────────────────

let _indexFile: IndexFile | null = null;
let _indexPromise: Promise<IndexFile | null> | null = null;

let _facets: Facets | null = null;
let _facetsPromise: Promise<Facets | null> | null = null;

let _tools: ToolRecord[] | null = null;
let _toolsPromise: Promise<ToolRecord[]> | null = null;

const _detailCache = new Map<string, VideoDetail | null>();
const _detailPromises = new Map<string, Promise<VideoDetail | null>>();

// ── Svelte 5 reactive state ────────────────────────────────────────────────

/**
 * Reactive array of all IndexRecords.
 * Write to this after a successful loadIndex() to make VideoGrid / search reactive.
 */
let _videos = $state<IndexRecord[]>([]);

export function getVideos(): IndexRecord[] {
  return _videos;
}

// ── Core loaders ──────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Load the compact index. Returns cached value immediately on subsequent calls.
 * Also populates the reactive _videos state.
 */
export function loadIndex(): Promise<IndexFile | null> {
  if (_indexFile !== null) return Promise.resolve(_indexFile);
  if (_indexPromise) return _indexPromise;

  _indexPromise = fetchJson<IndexFile>('/data/index.json').then((data) => {
    if (data) {
      _indexFile = data;
      _videos = data.videos;
    }
    return _indexFile;
  });

  return _indexPromise;
}

/**
 * Return a single IndexRecord by id (requires index to already be loaded).
 */
export function getById(id: string): IndexRecord | undefined {
  return _indexFile?.videos.find((v) => v.id === id);
}

/**
 * Load per-video detail. Per-id cache — only fetches once per id.
 * Returns null on 404 or error.
 */
export function loadDetail(id: string): Promise<VideoDetail | null> {
  if (_detailCache.has(id)) return Promise.resolve(_detailCache.get(id) ?? null);
  const existing = _detailPromises.get(id);
  if (existing) return existing;

  const p = fetchJson<VideoDetail>(
    `/data/video/${encodeURIComponent(id)}.json`
  ).then((data) => {
    _detailCache.set(id, data);
    return data;
  });

  _detailPromises.set(id, p);
  return p;
}

/**
 * Load precomputed facets (categories, creators, tags, topics).
 */
export function loadFacets(): Promise<Facets | null> {
  if (_facets !== null) return Promise.resolve(_facets);
  if (_facetsPromise) return _facetsPromise;

  _facetsPromise = fetchJson<Facets>('/data/facets.json').then((data) => {
    if (data) _facets = data;
    return _facets;
  });

  return _facetsPromise;
}

/**
 * Load corpus-wide verified tools list.
 */
export function loadTools(): Promise<ToolRecord[]> {
  if (_tools !== null) return Promise.resolve(_tools);
  if (_toolsPromise) return _toolsPromise;

  _toolsPromise = fetchJson<ToolRecord[]>('/data/tools.json').then((data) => {
    _tools = data ?? [];
    return _tools;
  });

  return _toolsPromise;
}
