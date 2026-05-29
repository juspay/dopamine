<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { loadTools, getTools } from '$lib/data.svelte.js';
  import CategoryChip from '$lib/components/CategoryChip.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Table, Pill, EmptyState } from '@juspay/svelte-ui-components';
  import type { JSONValue } from 'type-decoder';

  // Track whether the load attempt has settled (distinguishes "loading" from "empty")
  let _loadAttempted = $state(false);
  $effect(() => {
    loadTools().then(() => { _loadAttempted = true; });
  });

  // Reactive data
  const tools = $derived(getTools());

  // Filter state derived from URL params
  const urlStatus = $derived($page.url.searchParams.get('status') ?? 'all');
  const typeFilter = $derived($page.url.searchParams.get('type') ?? 'all');
  const catFilter = $derived($page.url.searchParams.get('cat') ?? 'all');
  const textFilter = $derived($page.url.searchParams.get('q') ?? '');

  // Derived unique filter options from data
  const allTypes = $derived(
    ['all', ...new Set(tools.map((t) => t.type).filter(Boolean).sort())]
  );
  const allCategories = $derived(
    ['all', ...new Set(tools.map((t) => t.category).filter(Boolean).sort())]
  );

  // Filtering + sorting
  const filtered = $derived.by(() => {
    let result = [...tools];

    // Status filter
    if (urlStatus !== 'all') {
      result = result.filter((t) => t.urlStatus === urlStatus);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Category filter
    if (catFilter !== 'all') {
      result = result.filter((t) => t.category === catFilter);
    }

    // Text search (name + description)
    if (textFilter.trim()) {
      const q = textFilter.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q)
      );
    }

    // Sort: live first, then by category, then by name
    result.sort((a, b) => {
      const aLive = a.urlStatus === 'live' ? 0 : a.urlStatus === 'redirect' ? 1 : 2;
      const bLive = b.urlStatus === 'live' ? 0 : b.urlStatus === 'redirect' ? 1 : 2;
      if (aLive !== bLive) return aLive - bLive;
      const catCmp = (a.category ?? '').localeCompare(b.category ?? '');
      if (catCmp !== 0) return catCmp;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });

    return result;
  });

  // Build tableData rows for the library Table.
  // Columns: Tool | Type | Status | Source | Category
  // Each row stores string|null values so the library can still sort if needed.
  // The cell snippet looks up filtered[rowIdx] for rich rendering.
  const tableHeaders = ['Tool', 'Type', 'Status', 'Source', 'Category'];

  const tableData = $derived<JSONValue[][]>(
    filtered.map((t) => [
      t.name ?? null,            // col 0 – Tool
      t.type ?? null,            // col 1 – Type
      t.urlStatus ?? null,       // col 2 – Status
      t.videoTitle || t.videoId || null, // col 3 – Source
      t.category ?? null,        // col 4 – Category
    ])
  );

  function setParam(key: string, value: string) {
    const params = new URLSearchParams($page.url.searchParams.toString());
    if (value === 'all' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    goto(`/tools?${params.toString()}`, { replaceState: true, keepFocus: true });
  }

  function onTextInput(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value;
    setParam('q', val);
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'live': return 'var(--ok)';
      case 'redirect': return 'var(--warn)';
      case 'dead': return 'var(--bad)';
      default: return 'var(--neutral)';
    }
  }

  function statusBg(status: string): string {
    switch (status) {
      case 'live': return 'rgba(63,185,80,0.12)';
      case 'redirect': return 'rgba(210,153,34,0.12)';
      case 'dead': return 'rgba(248,81,73,0.12)';
      default: return 'rgba(139,148,158,0.12)';
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'live': return 'Live';
      case 'redirect': return 'Redirect';
      case 'dead': return 'Dead';
      default: return status || 'Unknown';
    }
  }

  const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Tools' }];
</script>

<svelte:head>
  <title>Tools — Dopamine</title>
</svelte:head>

<div class="tools-page container">
  <Breadcrumbs items={breadcrumbs} />

  <header class="page-header">
    <div class="title-row">
      <h1 class="page-title">Tools</h1>
      {#if _loadAttempted}
        <p class="counts">
          {filtered.length}
          {#if filtered.length !== tools.length}
            <span class="counts-total"> of {tools.length}</span>
          {/if}
          {filtered.length === 1 ? 'tool' : 'tools'}
        </p>
      {/if}
    </div>

    <div class="filters">
      <!-- Text search -->
      <div class="search-wrap">
        <span class="search-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          class="search-input"
          type="search"
          placeholder="Search tools…"
          value={textFilter}
          oninput={onTextInput}
          aria-label="Search tools"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <!-- URL status filter -->
      <div class="filter-group">
        <label class="filter-label" for="filter-status">Status</label>
        <select
          id="filter-status"
          class="filter-select"
          value={urlStatus}
          onchange={(e) => setParam('status', (e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="all">All</option>
          <option value="live">Live only</option>
          <option value="redirect">Redirect</option>
          <option value="dead">Dead</option>
        </select>
      </div>

      <!-- Type filter -->
      <div class="filter-group">
        <label class="filter-label" for="filter-type">Type</label>
        <select
          id="filter-type"
          class="filter-select"
          value={typeFilter}
          onchange={(e) => setParam('type', (e.currentTarget as HTMLSelectElement).value)}
        >
          {#each allTypes as t}
            <option value={t}>{t === 'all' ? 'All types' : t}</option>
          {/each}
        </select>
      </div>

      <!-- Category filter -->
      <div class="filter-group">
        <label class="filter-label" for="filter-cat">Category</label>
        <select
          id="filter-cat"
          class="filter-select"
          value={catFilter}
          onchange={(e) => setParam('cat', (e.currentTarget as HTMLSelectElement).value)}
        >
          {#each allCategories as c}
            <option value={c}>{c === 'all' ? 'All categories' : c}</option>
          {/each}
        </select>
      </div>
    </div>
  </header>

  {#if !_loadAttempted}
    <Spinner />
  {:else}
    <div class="table-container-wrap">
      <Table
        {tableHeaders}
        {tableData}
        sortable={false}
        stickyHeader={true}
        isTableScrollable={true}
        classes="tools-table-override"
      >
        {#snippet cell(value: JSONValue, rowIdx: number, colIdx: number)}
          {@const tool = filtered[rowIdx]}
          {#if colIdx === 0}
            <!-- Tool name + description + external link -->
            <div class="tool-name-cell">
              {#if tool?.url}
                <a
                  class="tool-name"
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={tool.url}
                >
                  {tool.name}
                  <span class="ext-icon" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </span>
                </a>
              {:else}
                <span class="tool-name tool-name--no-link">{tool?.name}</span>
              {/if}
              {#if tool?.description}
                <p class="tool-desc">{tool.description}</p>
              {/if}
            </div>
          {:else if colIdx === 1}
            <!-- Type pill -->
            {#if tool?.type}
              <Pill text={tool.type} />
            {:else}
              <span class="na">—</span>
            {/if}
          {:else if colIdx === 2}
            <!-- URL status pill with per-instance color override -->
            <span
              style="--pill-background:{statusBg(tool?.urlStatus ?? '')};--pill-color:{statusColor(tool?.urlStatus ?? '')};--pill-hover-background:{statusBg(tool?.urlStatus ?? '')};--pill-hover-color:{statusColor(tool?.urlStatus ?? '')}"
            >
              <Pill text={statusLabel(tool?.urlStatus ?? '')} />
            </span>
          {:else if colIdx === 3}
            <!-- Source video link -->
            {#if tool?.videoId}
              <a class="video-link" href={`/video/${encodeURIComponent(tool.videoId)}`}>
                {tool.videoTitle || tool.videoId}
              </a>
            {:else}
              <span class="na">—</span>
            {/if}
          {:else if colIdx === 4}
            <!-- Category chip -->
            {#if tool?.category}
              <CategoryChip cat={tool.category} />
            {:else}
              <span class="na">—</span>
            {/if}
          {/if}
        {/snippet}

        {#snippet empty()}
          <EmptyState
            title={tools.length === 0 ? 'No tools found' : 'No tools match your filters'}
            description={tools.length === 0
              ? 'Tools will appear here once the data loads.'
              : 'Try adjusting your search or filter criteria.'}
          />
        {/snippet}
      </Table>
    </div>
  {/if}
</div>

<style>
  .tools-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Header ────────────────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  .page-title {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }

  .counts {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
  }

  .counts-total {
    color: var(--faint);
    font-weight: 400;
  }

  /* ── Filters ────────────────────────────────────────────────────────────── */
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    overflow: hidden;
    transition: border-color var(--t-fast);
    flex: 1;
    min-width: 180px;
    max-width: 320px;
  }

  .search-wrap:focus-within {
    border-color: var(--accent);
  }

  .search-icon {
    display: flex;
    align-items: center;
    padding: 0 8px 0 12px;
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
    padding: 7px 12px 7px 0;
    min-width: 0;
  }

  .search-input::placeholder {
    color: var(--faint);
  }

  .search-input::-webkit-search-cancel-button {
    display: none;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-label {
    font-size: var(--fs-0);
    color: var(--faint);
    white-space: nowrap;
    user-select: none;
  }

  .filter-select {
    appearance: none;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    color: var(--text);
    font-size: var(--fs-1);
    padding: 5px 28px 5px 12px;
    cursor: pointer;
    outline: none;
    transition: border-color var(--t-fast);
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7480' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    min-width: 100px;
  }

  .filter-select:focus {
    border-color: var(--accent);
  }

  .filter-select:hover {
    border-color: var(--muted);
  }

  /* ── Table wrapper ──────────────────────────────────────────────────────── */
  /* The library Table with isTableScrollable uses a fixed container height.
     Override via CSS var to fill available space up to a comfortable viewport
     fraction, letting it scroll horizontally on narrow screens. */
  .table-container-wrap {
    --table-container-height: clamp(300px, 65vh, 800px);
    /* Allow horizontal overflow so the inner scrollable-table handles it */
    overflow-x: auto;
  }

  /* ── Cell content ───────────────────────────────────────────────────────── */
  .tool-name-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 160px;
    max-width: 260px;
  }

  .tool-name {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--accent);
    font-weight: 600;
    font-size: var(--fs-1);
    text-decoration: none;
    word-break: break-word;
  }

  .tool-name:hover {
    text-decoration: underline;
  }

  .tool-name--no-link {
    color: var(--text);
  }

  .ext-icon {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--faint);
    opacity: 0.7;
  }

  .tool-desc {
    margin: 0;
    font-size: var(--fs-0);
    color: var(--muted);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .video-link {
    color: var(--muted);
    font-size: var(--fs-1);
    text-decoration: none;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-width: 140px;
    max-width: 240px;
  }

  .video-link:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .na {
    color: var(--faint);
    font-size: var(--fs-0);
  }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .tools-page {
      gap: 14px;
    }

    .page-title {
      font-size: var(--fs-3);
    }

    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .search-wrap {
      max-width: none;
    }

    .filter-group {
      justify-content: space-between;
    }

    .filter-select {
      flex: 1;
    }
  }
</style>
