<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { loadTools, getTools } from '$lib/data.svelte.js';
  import CategoryChip from '$lib/components/CategoryChip.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Table, Pill, EmptyState, Select, Input } from '@juspay/svelte-ui-components';
  import type { JSONValue } from 'type-decoder';
  import type { SelectItem } from '@juspay/svelte-ui-components';

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

  // SUI Select expects value as string[] — wrap single filter values
  const statusValue = $derived([urlStatus]);
  const typeValue = $derived([typeFilter]);
  const catValue = $derived([catFilter]);

  // Derived unique filter options from data mapped to SUI SelectItem shape
  const statusItems: SelectItem[] = [
    { id: 'all', label: 'All statuses' },
    { id: 'live', label: 'Live only' },
    { id: 'redirect', label: 'Redirect' },
    { id: 'dead', label: 'Dead' },
  ];

  const typeItems = $derived<SelectItem[]>([
    { id: 'all', label: 'All types' },
    ...[...new Set(tools.map((t) => t.type).filter(Boolean).sort())].map((t) => ({ id: t, label: t })),
  ]);

  const catItems = $derived<SelectItem[]>([
    { id: 'all', label: 'All categories' },
    ...[...new Set(tools.map((t) => t.category).filter(Boolean).sort())].map((c) => ({ id: c, label: c })),
  ]);

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
  const tableHeaders = ['Tool', 'Type', 'Status', 'Source', 'Category'];

  const tableData = $derived<JSONValue[][]>(
    filtered.map((t) => [
      t.name ?? null,
      t.type ?? null,
      t.urlStatus ?? null,
      t.videoTitle || t.videoId || null,
      t.category ?? null,
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

  function onSearchInput(q: string) {
    setParam('q', q);
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
      case 'live': return 'var(--ok-bg)';
      case 'redirect': return 'var(--warn-bg)';
      case 'dead': return 'var(--bad-bg)';
      default: return 'var(--neutral-bg)';
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
      <!-- Text search via SUI Input (live filter-as-you-type) -->
      <div class="search-wrap">
        <Input
          value={textFilter}
          placeholder="Search tools…"
          onInput={(v) => onSearchInput(v)}
          classes="tools-search-input"
        />
      </div>

      <!-- URL status filter — SUI Select -->
      <div class="filter-group">
        <label class="filter-label" for="filter-status">Status</label>
        <div class="select-wrap">
          <Select
            items={statusItems}
            value={statusValue}
            onchange={(v) => setParam('status', v[0] ?? 'all')}
            placeholder="All statuses"
          />
        </div>
      </div>

      <!-- Type filter — SUI Select (searchable since list can be long) -->
      <div class="filter-group">
        <label class="filter-label" for="filter-type">Type</label>
        <div class="select-wrap">
          <Select
            items={typeItems}
            value={typeValue}
            onchange={(v) => setParam('type', v[0] ?? 'all')}
            placeholder="All types"
            searchable
          />
        </div>
      </div>

      <!-- Category filter — SUI Select (searchable) -->
      <div class="filter-group">
        <label class="filter-label" for="filter-cat">Category</label>
        <div class="select-wrap">
          <Select
            items={catItems}
            value={catValue}
            onchange={(v) => setParam('cat', v[0] ?? 'all')}
            placeholder="All categories"
            searchable
          />
        </div>
      </div>
    </div>
  </header>

  {#if !_loadAttempted}
    <Spinner />
  {:else}
    <!-- Desktop: SUI Table (hidden at ≤640px) -->
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
            <!-- URL status pill with semantic token colors -->
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

    <!-- Mobile: card list (shown only at ≤640px instead of table) -->
    <div class="mobile-card-list" aria-label="Tools list">
      {#if filtered.length === 0}
        <EmptyState
          title={tools.length === 0 ? 'No tools found' : 'No tools match your filters'}
          description={tools.length === 0
            ? 'Tools will appear here once the data loads.'
            : 'Try adjusting your search or filter criteria.'}
        />
      {:else}
        {#each filtered as tool (tool.name + tool.videoId)}
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div class="mobile-card-title-row">
                {#if tool.url}
                  <a
                    class="mobile-tool-name"
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
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
                  <span class="mobile-tool-name mobile-tool-name--no-link">{tool.name}</span>
                {/if}
              </div>
              <!-- Status badge -->
              <span
                class="mobile-status-badge"
                style="color:{statusColor(tool.urlStatus)};background:{statusBg(tool.urlStatus)};border-color:color-mix(in srgb,{statusColor(tool.urlStatus)} 30%,transparent)"
              >
                {statusLabel(tool.urlStatus)}
              </span>
            </div>

            {#if tool.description}
              <p class="mobile-tool-desc">{tool.description}</p>
            {/if}

            <div class="mobile-card-meta">
              {#if tool.type}
                <Pill text={tool.type} />
              {/if}
              {#if tool.category}
                <CategoryChip cat={tool.category} />
              {/if}
              {#if tool.videoId}
                <a class="mobile-video-link" href={`/video/${encodeURIComponent(tool.videoId)}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  {tool.videoTitle || 'Source video'}
                </a>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .tools-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  /* ── Header ────────────────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .page-title {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: var(--fw-bold);
    color: var(--text);
    line-height: var(--lh-tight);
  }

  .counts {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
  }

  .counts-total {
    color: var(--faint);
    font-weight: var(--fw-regular);
  }

  /* ── Filters ────────────────────────────────────────────────────────────── */
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .search-wrap {
    flex: 1;
    min-width: 180px;
    max-width: 320px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .filter-label {
    font-size: var(--fs-0);
    color: var(--faint);
    white-space: nowrap;
    user-select: none;
  }

  .select-wrap {
    min-width: 120px;
    /* Constrain SUI Select width */
    --select-width: 140px;
    --select-trigger-min-height: 34px;
    --select-trigger-padding: 5px 12px;
    --select-trigger-border-radius: var(--radius-pill);
    --select-dropdown-max-height: 220px;
  }

  /* ── Table wrapper (desktop only) ──────────────────────────────────────── */
  .table-container-wrap {
    --table-container-height: clamp(300px, 65vh, 800px);
    overflow-x: auto;
  }

  /* ── Mobile card list (shown only ≤640px) ───────────────────────────────── */
  .mobile-card-list {
    display: none;
    flex-direction: column;
    gap: var(--space-3);
  }

  .mobile-card {
    padding: var(--space-3) var(--space-4);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .mobile-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .mobile-card-title-row {
    flex: 1;
    min-width: 0;
  }

  .mobile-tool-name {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--accent);
    font-weight: var(--fw-semibold);
    font-size: var(--fs-1);
    text-decoration: none;
    word-break: break-word;
  }

  .mobile-tool-name:hover {
    text-decoration: underline;
  }

  .mobile-tool-name--no-link {
    color: var(--text);
  }

  .mobile-status-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: var(--fw-medium);
    border: 1px solid;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .mobile-tool-desc {
    margin: 0;
    font-size: var(--fs-0);
    color: var(--muted);
    line-height: var(--lh-normal);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .mobile-card-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .mobile-video-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--muted);
    font-size: var(--fs-0);
    text-decoration: none;
    transition: color var(--t-fast);
  }

  .mobile-video-link:hover {
    color: var(--accent);
  }

  /* ── Shared cell styles (desktop table) ────────────────────────────────── */
  .tool-name-cell {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 160px;
    max-width: 260px;
  }

  .tool-name {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--accent);
    font-weight: var(--fw-semibold);
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
    line-height: var(--lh-normal);
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
      gap: var(--space-3);
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

    .select-wrap {
      --select-width: 100%;
      flex: 1;
    }

    /* Hide desktop table, show mobile cards */
    .table-container-wrap {
      display: none;
    }

    .mobile-card-list {
      display: flex;
    }
  }
</style>
