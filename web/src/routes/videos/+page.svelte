<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getVideos, isIndexLoaded, loadFacets, getFacets } from '$lib/data.svelte.js';
  import { catColor, catBg, verifColor } from '$lib/format.js';
  import type { IndexRecord } from '$lib/types.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { Input, Select } from '@juspay/svelte-ui-components';
  import type { SelectItem } from '@juspay/svelte-ui-components';

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
  let projs    = $state<string[]>([]);
  let verif    = $state('all');
  let act      = $state('all');
  let sort     = $state('best');
  // Low-quality (thin) learnings are hidden by default so the empty/unprocessed
  // tail never leads the library; a toggle brings them back.
  let showThin = $state(false);

  // Sync from URL on navigation (including first load).
  $effect(() => {
    q     = sp.get('q')    ?? '';
    verif = sp.get('verif') ?? 'all';
    act = sp.get('act') ?? 'all';
    sort  = sp.get('sort')  ?? 'best';
    showThin = sp.get('thin') === '1';
    const rawCats = sp.get('cat');
    cats = rawCats ? rawCats.split(',').filter(Boolean) : [];
    const rawProjs = sp.get('project');
    projs = rawProjs ? rawProjs.split(',').filter(Boolean) : [];
  });

  // ── Push current filter state into URL ───────────────────────────────────
  function syncUrl() {
    const url = new URL($page.url);
    if (q.trim()) url.searchParams.set('q', q.trim()); else url.searchParams.delete('q');
    if (cats.length) url.searchParams.set('cat', cats.join(',')); else url.searchParams.delete('cat');
    if (projs.length) url.searchParams.set('project', projs.join(',')); else url.searchParams.delete('project');
    if (verif !== 'all') url.searchParams.set('verif', verif); else url.searchParams.delete('verif');
    if (act !== 'all') url.searchParams.set('act', act); else url.searchParams.delete('act');
    if (sort !== 'best') url.searchParams.set('sort', sort); else url.searchParams.delete('sort');
    if (showThin) url.searchParams.set('thin', '1'); else url.searchParams.delete('thin');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  // ── Category list from facets (or derive from index) ─────────────────────
  const allCategories = $derived(
    facets
      ? facets.categories.map((c) => c.name)
      : [...new Set(all.map((v) => v.category))].sort()
  );

  // ── Project list from facets (empty when nothing is mapped yet) ──────────
  const allProjects = $derived(facets?.projects?.map((p) => p.name) ?? []);

  // ── Verification options ─────────────────────────────────────────────────
  const VERIF_OPTIONS = [
    { value: 'all',               label: 'All' },
    { value: 'verified_useful',   label: 'Verified' },
    { value: 'partially_verified', label: 'Partial' },
    { value: 'not_verified',      label: 'Unverified' },
    { value: 'outdated',          label: 'Outdated' },
    { value: 'unknown',           label: 'Not analysed' },
  ] as const;

  // ── Actionability (triage) options ───────────────────────────────────────
  const ACT_OPTIONS = [
    { value: 'all',            label: 'All' },
    { value: 'apply-now',      label: 'Apply now' },
    { value: 'evaluate-later', label: 'Evaluate later' },
    { value: 'reference-only', label: 'Reference' },
    { value: 'skip',           label: 'Saved' },
    { value: 'untriaged',      label: 'Not triaged' },
  ] as const;
  const actColor = (v: string): string =>
    ({ 'apply-now': '#12924a', 'evaluate-later': '#0b8ea3', 'reference-only': '#a06a2c', skip: '#7d8896', untriaged: '#9aa0a6' })[v] ?? '#7d8896';

  // ── Sort options — shaped for SUI Select (id + label) ───────────────────
  const SORT_OPTIONS: SelectItem[] = [
    { id: 'best',       label: 'Best first' },
    { id: 'date-desc',  label: 'Newest first' },
    { id: 'date-asc',   label: 'Oldest first' },
    { id: 'dur-desc',   label: 'Longest first' },
    { id: 'likes-desc', label: 'Most liked' },
    { id: 'cat-asc',    label: 'Category A–Z' },
  ];

  // ── Filter + sort pipeline ────────────────────────────────────────────────
  // Tier order matches the data builder (src/dashboard/quality.ts): applicable
  // learnings first, thin tail last.
  const TIER_RANK: Record<string, number> = { featured: 0, standard: 1, thin: 2 };

  // Base filters — everything EXCEPT the quality floor. Shared by the list and
  // the hidden-thin counter so the two can never drift apart.
  function matchesBase(v: IndexRecord): boolean {
    const needle = q.trim().toLowerCase();
    if (needle) {
      const haystack = [v.title, v.username, v.fullName, v.category, v.subcategory, ...v.tags]
        .join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (cats.length && !cats.includes(v.category)) return false;
    if (projs.length && !projs.some((p) => (v.appliesTo ?? []).includes(p))) return false;
    if (verif !== 'all' && v.verification !== verif) return false;
    if (act !== 'all' && v.actionability !== act) return false;
    return true;
  }

  const filtered = $derived((): IndexRecord[] => {
    // quality floor — hide the thin/unprocessed tail unless asked to show it
    let out = all.filter((v) => matchesBase(v) && (showThin || v.tier !== 'thin'));

    // sort
    switch (sort) {
      case 'best':
        out = [...out].sort((a, b) =>
          (TIER_RANK[a.tier] - TIER_RANK[b.tier]) || (b.quality - a.quality) || b.date.localeCompare(a.date));
        break;
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

  function toggleProj(project: string) {
    projs = projs.includes(project)
      ? projs.filter((p) => p !== project)
      : [...projs, project];
    syncUrl();
  }

  function clearAll() {
    q     = '';
    cats  = [];
    projs = [];
    verif = 'all';
    act   = 'all';
    sort  = 'best';
    showThin = false;
    syncUrl();
  }

  function toggleThin() {
    showThin = !showThin;
    syncUrl();
  }

  // How many thin learnings the quality floor is currently hiding (respecting
  // ALL other active filters, search included) — powers the toggle label.
  const hiddenThin = $derived(
    showThin ? 0 : all.filter((v) => v.tier === 'thin' && matchesBase(v)).length
  );

  // SUI Select.onchange passes string[]; we extract the first element.
  function handleSortChange(values: string[]) {
    const next = values[0];
    if (next && next !== sort) {
      sort = next;
      syncUrl();
    }
  }

  const hasFilters = $derived(
    q.trim() !== '' || cats.length > 0 || projs.length > 0 || verif !== 'all' || act !== 'all' || sort !== 'best' || showThin
  );
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
    <!-- Text search — SUI Input with addFocusColor -->
    <div class="search-wrap">
      <Input
        value={q}
        placeholder="Search titles, creators, tags…"
        addFocusColor={true}
        autoComplete="off"
        onInput={(val) => { q = val; syncUrl(); }}
        classes="videos-search-input"
      />
    </div>

    <!-- Sort — SUI Select (single-select, no search) -->
    <div class="select-wrap">
      <Select
        items={SORT_OPTIONS}
        value={[sort]}
        onchange={handleSortChange}
        classes="videos-sort-select"
      />
    </div>

    <!-- Quality floor toggle -->
    {#if showThin || hiddenThin > 0}
      <button class="thin-toggle" class:active={showThin} type="button" onclick={toggleThin}
        aria-pressed={showThin}>
        {showThin ? 'Hide low-quality' : `Show ${hiddenThin} low-quality`}
      </button>
    {/if}
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

  <!-- Project chips (only when learnings have been mapped) -->
  {#if allProjects.length > 0}
    <div class="cat-chips" role="group" aria-label="Filter by project">
      {#each allProjects as project}
        {@const active = projs.includes(project)}
        <button
          class="cat-chip"
          class:active
          type="button"
          aria-pressed={active}
          onclick={() => toggleProj(project)}
        >→ {project}</button>
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

  <!-- Actionability (triage) filter -->
  <div class="verif-pills" role="group" aria-label="Filter by actionability">
    {#each ACT_OPTIONS as opt}
      {@const active = act === opt.value}
      <button
        class="verif-pill"
        class:active
        type="button"
        aria-pressed={active}
        style={opt.value !== 'all' ? `--pill-color:${actColor(opt.value)}` : ''}
        onclick={() => { act = opt.value; syncUrl(); }}
      >
        {#if opt.value !== 'all'}
          <span class="verif-dot" style="background:{actColor(opt.value)}" aria-hidden="true"></span>
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
    padding: var(--space-6) 0 var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* ── Header ────────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
  }

  .page-title {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: var(--fw-bold);
    color: var(--text);
    line-height: var(--lh-tight);
  }

  .count-badge {
    font-size: var(--fs-1);
    font-weight: var(--fw-medium);
    color: var(--muted);
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: var(--space-1) var(--space-2);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .clear-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    color: var(--muted);
    font-size: var(--fs-0);
    padding: var(--space-1) var(--space-3);
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
    gap: var(--space-2);
    align-items: flex-start;
    flex-wrap: wrap;
  }

  /* SUI Input wrapper: stretch to fill remaining space */
  .search-wrap {
    flex: 1;
    min-width: 200px;
  }

  /* Override SUI Input vars to fit the pill-style search row */
  .search-wrap :global(.videos-search-input input) {
    width: 100%;
    margin: 0;
    border-radius: var(--radius-pill);
    padding: var(--space-2) var(--space-4);
    background: var(--elevated);
  }

  .search-wrap :global(.videos-search-input) {
    width: 100%;
  }

  /* SUI Select wrapper: fixed-width sort control */
  .select-wrap {
    flex-shrink: 0;
    min-width: 150px;
  }

  .select-wrap :global(.videos-sort-select) {
    width: 100%;
  }

  /* Quality-floor toggle */
  .thin-toggle {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    color: var(--muted);
    font-size: var(--fs-0);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    white-space: nowrap;
    transition: color var(--t-fast), border-color var(--t-fast);
    flex-shrink: 0;
  }

  .thin-toggle:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .thin-toggle.active {
    color: var(--text);
    border-color: var(--accent);
  }

  /* ── Category chips ────────────────────────────────────── */
  .cat-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .cat-chip {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: var(--fw-medium);
    line-height: var(--lh-normal);
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
    gap: var(--space-1);
  }

  .verif-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: var(--fw-medium);
    line-height: var(--lh-normal);
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
    background: var(--accent-subtle);
    border-color: var(--pill-color, var(--accent));
    color: var(--pill-color, var(--accent));
  }

  .verif-dot {
    width: var(--space-1);
    height: var(--space-1);
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Results ───────────────────────────────────────────── */
  .results {
    margin-top: var(--space-1);
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

    .select-wrap {
      min-width: 0;
      width: 100%;
    }
  }
</style>
