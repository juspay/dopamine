<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { loadTools, getTools } from '$lib/data.svelte.js';
  import Chip from '$lib/components/Chip.svelte';
  import CategoryChip from '$lib/components/CategoryChip.svelte';
  import CreatorLink from '$lib/components/CreatorLink.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

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
  {:else if filtered.length === 0}
    <EmptyState message={tools.length === 0 ? 'No tools found.' : 'No tools match your filters.'} />
  {:else}
    <div class="table-wrap" role="region" aria-label="Tools table">
      <table class="tools-table">
        <thead>
          <tr>
            <th class="col-name" scope="col">Tool</th>
            <th class="col-type" scope="col">Type</th>
            <th class="col-status" scope="col">Status</th>
            <th class="col-category" scope="col">Category</th>
            <th class="col-creator" scope="col">Creator</th>
            <th class="col-video" scope="col">Source Video</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as tool (tool.name + tool.videoId)}
            <tr class="tool-row">
              <!-- Tool name + description + external link -->
              <td class="col-name">
                <div class="tool-name-cell">
                  {#if tool.url}
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
                    <span class="tool-name tool-name--no-link">{tool.name}</span>
                  {/if}
                  {#if tool.description}
                    <p class="tool-desc">{tool.description}</p>
                  {/if}
                </div>
              </td>

              <!-- Type chip -->
              <td class="col-type">
                {#if tool.type}
                  <Chip label={tool.type} />
                {:else}
                  <span class="na">—</span>
                {/if}
              </td>

              <!-- URL status badge -->
              <td class="col-status">
                <Chip
                  label={statusLabel(tool.urlStatus)}
                  color={statusColor(tool.urlStatus)}
                  bg={statusBg(tool.urlStatus)}
                />
              </td>

              <!-- Category -->
              <td class="col-category">
                {#if tool.category}
                  <CategoryChip cat={tool.category} />
                {:else}
                  <span class="na">—</span>
                {/if}
              </td>

              <!-- Creator -->
              <td class="col-creator">
                {#if tool.username}
                  <CreatorLink name={tool.username} />
                {:else}
                  <span class="na">—</span>
                {/if}
              </td>

              <!-- Source video link -->
              <td class="col-video">
                {#if tool.videoId}
                  <a class="video-link" href={`/video/${encodeURIComponent(tool.videoId)}`}>
                    {tool.videoTitle || tool.videoId}
                  </a>
                {:else}
                  <span class="na">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
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

  /* ── Table ─────────────────────────────────────────────────────────────── */
  .table-wrap {
    overflow-x: auto;
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }

  .tools-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-1);
  }

  .tools-table thead {
    background: var(--elevated);
    border-bottom: 1px solid var(--border);
  }

  .tools-table th {
    padding: 10px 14px;
    text-align: left;
    font-size: var(--fs-0);
    font-weight: 600;
    color: var(--faint);
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .tool-row {
    border-bottom: 1px solid var(--border);
    transition: background var(--t-fast);
  }

  .tool-row:last-child {
    border-bottom: none;
  }

  .tool-row:hover {
    background: var(--elevated);
  }

  .tools-table td {
    padding: 12px 14px;
    vertical-align: top;
    color: var(--text);
  }

  /* ── Column widths ──────────────────────────────────────────────────────── */
  .col-name {
    min-width: 180px;
    max-width: 280px;
  }

  .col-type {
    width: 100px;
    white-space: nowrap;
  }

  .col-status {
    width: 90px;
    white-space: nowrap;
  }

  .col-category {
    width: 170px;
  }

  .col-creator {
    width: 130px;
    white-space: nowrap;
  }

  .col-video {
    min-width: 160px;
    max-width: 280px;
  }

  /* ── Cell content ───────────────────────────────────────────────────────── */
  .tool-name-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
    -webkit-box-orient: vertical;
    overflow: hidden;
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
  @media (max-width: 900px) {
    .col-category,
    .col-creator {
      display: none;
    }
  }

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

    .col-video {
      display: none;
    }
  }
</style>
