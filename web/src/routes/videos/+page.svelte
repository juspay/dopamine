<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getVideos, isIndexLoaded, loadFacets, getFacets } from '$lib/data.svelte.js';
  import { catColor, catBg, verifColor } from '$lib/format.js';
  import type { IndexRecord } from '$lib/types.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

  // ── Load facets once ─────────────────────────────────────────────────────
  $effect(() => { loadFacets(); });

  // ── Reactive data ────────────────────────────────────────────────────────
  const all = $derived(getVideos());
  const loaded = $derived(isIndexLoaded());
  const facets = $derived(getFacets());

  // ── URL param init ───────────────────────────────────────────────────────
  // We read URL params once (they change via our own goto calls, so derive from $page).
  const sp = $derived($page.url.searchParams);

  let q        = $state('');
  let cats     = $state<string[]>([]);
  let verif    = $state('all');
  let sort     = $state('date-desc');

  // Sync from URL on navigation (including first load).
  $effect(() => {
    q     = sp.get('q')    ?? '';
    verif = sp.get('verif') ?? 'all';
    sort  = sp.get('sort')  ?? 'date-desc';
    const rawCats = sp.get('cat');
    cats = rawCats ? rawCats.split(',').filter(Boolean) : [];
  });

  // ── Push current filter state into URL ───────────────────────────────────
  function syncUrl() {
    const url = new URL($page.url);
    if (q.trim()) url.searchParams.set('q', q.trim()); else url.searchParams.delete('q');
    if (cats.length) url.searchParams.set('cat', cats.join(',')); else url.searchParams.delete('cat');
    if (verif !== 'all') url.searchParams.set('verif', verif); else url.searchParams.delete('verif');
    if (sort !== 'date-desc') url.searchParams.set('sort', sort); else url.searchParams.delete('sort');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  // ── Category list from facets (or derive from index) ─────────────────────
  const allCategories = $derived(
    facets
      ? facets.categories.map((c) => c.name)
      : [...new Set(all.map((v) => v.category))].sort()
  );

  // ── Verification options ─────────────────────────────────────────────────
  const VERIF_OPTIONS = [
    { value: 'all',               label: 'All' },
    { value: 'verified_useful',   label: 'Verified' },
    { value: 'partially_verified', label: 'Partial' },
    { value: 'not_verified',      label: 'Unverified' },
    { value: 'outdated',          label: 'Outdated' },
  ] as const;

  // ── Sort options ─────────────────────────────────────────────────────────
  const SORT_OPTIONS = [
    { value: 'date-desc',  label: 'Newest first' },
    { value: 'date-asc',   label: 'Oldest first' },
    { value: 'dur-desc',   label: 'Longest first' },
    { value: 'likes-desc', label: 'Most liked' },
    { value: 'cat-asc',    label: 'Category A–Z' },
  ] as const;

  // ── Filter + sort pipeline ────────────────────────────────────────────────
  const filtered = $derived((): IndexRecord[] => {
    const needle = q.trim().toLowerCase();

    let out = all.filter((v) => {
      // text search
      if (needle) {
        const haystack = [
          v.title,
          v.username,
          v.fullName,
          v.category,
          v.subcategory,
          ...v.tags,
        ].join(' ').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      // category multi-select
      if (cats.length && !cats.includes(v.category)) return false;

      // verification filter
      if (verif !== 'all' && v.verification !== verif) return false;

      return true;
    });

    // sort
    switch (sort) {
      case 'date-asc':
        out = [...out].sort((a, b) => a.date.localeCompare(b.date));
        break;
      case 'date-desc':
        out = [...out].sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'dur-desc':
        out = [...out].sort((a, b) => b.durationSec - a.durationSec);
        break;
      case 'likes-desc':
        out = [...out].sort((a, b) => b.likes - a.likes);
        break;
      case 'cat-asc':
        out = [...out].sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return out;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleCat(cat: string) {
    cats = cats.includes(cat)
      ? cats.filter((c) => c !== cat)
      : [...cats, cat];
    syncUrl();
  }

  function clearAll() {
    q     = '';
    cats  = [];
    verif = 'all';
    sort  = 'date-desc';
    syncUrl();
  }

  const hasFilters = $derived(q.trim() !== '' || cats.length > 0 || verif !== 'all' || sort !== 'date-desc');
</script>

<div class="library-page">
  <!-- Header row -->
  <div class="page-header">
    <div class="header-left">
      <h1 class="page-title">Library</h1>
      {#if loaded}
        <span class="count-badge">{filtered().length.toLocaleString()}</span>
      {/if}
    </div>
    {#if hasFilters}
      <button class="clear-btn" onclick={clearAll} type="button">Clear filters</button>
    {/if}
  </div>

  <!-- Controls bar -->
  <div class="controls">
    <!-- Text search — inline, not using SearchBox (we manage the value & debounce here) -->
    <div class="search-wrap">
      <span class="search-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        class="search-input"
        type="search"
        placeholder="Search titles, creators, tags…"
        aria-label="Search videos"
        autocomplete="off"
        spellcheck="false"
        value={q}
        oninput={(e) => {
          q = (e.currentTarget as HTMLInputElement).value;
          syncUrl();
        }}
      />
      {#if q}
        <button
          class="search-clear"
          type="button"
          aria-label="Clear search"
          onclick={() => { q = ''; syncUrl(); }}
        >✕</button>
      {/if}
    </div>

    <!-- Sort select -->
    <div class="select-wrap">
      <select
        class="sort-select"
        aria-label="Sort order"
        value={sort}
        onchange={(e) => {
          sort = (e.currentTarget as HTMLSelectElement).value;
          syncUrl();
        }}
      >
        {#each SORT_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <span class="select-arrow" aria-hidden="true">▾</span>
    </div>
  </div>

  <!-- Category chips -->
  {#if allCategories.length > 0}
    <div class="cat-chips" role="group" aria-label="Filter by category">
      {#each allCategories as cat}
        {@const active = cats.includes(cat)}
        <button
          class="cat-chip"
          class:active
          type="button"
          aria-pressed={active}
          style="--chip-color:{catColor(cat)};--chip-bg:{catBg(cat)}"
          onclick={() => toggleCat(cat)}
        >{cat}</button>
      {/each}
    </div>
  {/if}

  <!-- Verification filter pills -->
  <div class="verif-pills" role="group" aria-label="Filter by verification">
    {#each VERIF_OPTIONS as opt}
      {@const active = verif === opt.value}
      <button
        class="verif-pill"
        class:active
        type="button"
        aria-pressed={active}
        style={opt.value !== 'all' ? `--pill-color:${verifColor(opt.value)}` : ''}
        onclick={() => { verif = opt.value; syncUrl(); }}
      >
        {#if opt.value !== 'all'}
          <span class="verif-dot" style="background:{verifColor(opt.value)}" aria-hidden="true"></span>
        {/if}
        {opt.label}
      </button>
    {/each}
  </div>

  <!-- Results -->
  <div class="results">
    {#if !loaded}
      <Spinner label="Loading library…" />
    {:else}
      <VideoGrid
        items={filtered()}
        emptyMessage={hasFilters ? 'No videos match your filters. Try adjusting or clearing them.' : 'No videos found.'}
      />
    {/if}
  </div>
</div>

<style>
  .library-page {
    padding: 24px 0 64px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── Header ────────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .page-title {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }

  .count-badge {
    font-size: var(--fs-1);
    font-weight: 500;
    color: var(--muted);
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 2px 10px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .clear-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    color: var(--muted);
    font-size: var(--fs-0);
    padding: 4px 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: color var(--t-fast), border-color var(--t-fast);
    flex-shrink: 0;
  }

  .clear-btn:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  /* ── Controls bar ──────────────────────────────────────── */
  .controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  /* Search */
  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
    display: flex;
    align-items: center;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    overflow: hidden;
    transition: border-color var(--t-fast);
  }

  .search-wrap:focus-within {
    border-color: var(--accent);
  }

  .search-icon {
    display: flex;
    align-items: center;
    padding: 0 8px 0 14px;
    color: var(--faint);
    flex-shrink: 0;
    pointer-events: none;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-size: var(--fs-1);
    padding: 8px 6px;
    min-width: 0;
  }

  .search-input::placeholder {
    color: var(--faint);
  }

  .search-input::-webkit-search-cancel-button {
    display: none;
  }

  .search-clear {
    background: none;
    border: none;
    padding: 8px 12px;
    color: var(--faint);
    font-size: var(--fs-1);
    cursor: pointer;
    transition: color var(--t-fast);
    flex-shrink: 0;
  }

  .search-clear:hover {
    color: var(--text);
  }

  /* Sort select */
  .select-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .sort-select {
    appearance: none;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    color: var(--text);
    font-size: var(--fs-1);
    padding: 8px 32px 8px 14px;
    cursor: pointer;
    outline: none;
    transition: border-color var(--t-fast);
  }

  .sort-select:focus {
    border-color: var(--accent);
  }

  .sort-select option {
    background: var(--surface);
  }

  .select-arrow {
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: var(--faint);
    font-size: 10px;
    line-height: 1;
  }

  /* ── Category chips ────────────────────────────────────── */
  .cat-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .cat-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: 500;
    line-height: 1.6;
    border: 1px solid transparent;
    cursor: pointer;
    transition: filter var(--t-fast), border-color var(--t-fast), opacity var(--t-fast);
    color: var(--chip-color, var(--muted));
    background: var(--chip-bg, var(--elevated));
    opacity: 0.7;
  }

  .cat-chip:hover {
    opacity: 1;
    filter: brightness(1.2);
  }

  .cat-chip.active {
    border-color: var(--chip-color, var(--accent));
    opacity: 1;
    filter: brightness(1.1);
  }

  /* ── Verification pills ────────────────────────────────── */
  .verif-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .verif-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 12px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: 500;
    line-height: 1.6;
    border: 1px solid var(--border);
    background: var(--elevated);
    color: var(--muted);
    cursor: pointer;
    transition: color var(--t-fast), border-color var(--t-fast), background var(--t-fast);
  }

  .verif-pill:hover {
    color: var(--text);
    border-color: var(--pill-color, var(--accent));
  }

  .verif-pill.active {
    background: color-mix(in srgb, var(--pill-color, var(--accent)) 15%, var(--elevated));
    border-color: var(--pill-color, var(--accent));
    color: var(--pill-color, var(--accent));
  }

  .verif-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Results ───────────────────────────────────────────── */
  .results {
    margin-top: 4px;
  }

  /* ── Responsive ────────────────────────────────────────── */
  @media (max-width: 600px) {
    .page-title {
      font-size: var(--fs-3);
    }

    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .search-wrap {
      min-width: 0;
    }

    .sort-select {
      width: 100%;
    }
  }
</style>
