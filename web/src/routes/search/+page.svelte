<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import {
    getVideos,
    getTools,
    isIndexLoaded,
    loadTools
  } from '$lib/data.svelte.js';
  import type { IndexRecord, ToolRecord } from '$lib/types.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import CreatorLink from '$lib/components/CreatorLink.svelte';
  import TagChip from '$lib/components/TagChip.svelte';
  import CategoryChip from '$lib/components/CategoryChip.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';

  // Load tools once on mount
  $effect(() => {
    loadTools();
  });

  // Reactive query from URL
  const q = $derived($page.url.searchParams.get('q') ?? '');
  const ql = $derived(q.toLowerCase().trim());

  // All source data — reactive once loaded
  const all = $derived(getVideos());
  const allTools = $derived(getTools());
  const loaded = $derived(isIndexLoaded());

  // ── Video results ─────────────────────────────────────────────────────────
  const videoResults = $derived(
    ql === ''
      ? ([] as IndexRecord[])
      : all.filter(
          (v) =>
            v.title.toLowerCase().includes(ql) ||
            v.username.toLowerCase().includes(ql) ||
            v.fullName.toLowerCase().includes(ql) ||
            v.category.toLowerCase().includes(ql) ||
            v.subcategory.toLowerCase().includes(ql) ||
            v.tags.some((t) => t.toLowerCase().includes(ql))
        )
  );

  // ── Creator results — distinct usernames matching q ───────────────────────
  interface CreatorResult {
    name: string;
    fullName: string;
    count: number;
  }

  const creatorResults = $derived((): CreatorResult[] => {
    if (ql === '') return [];
    const map = new Map<string, CreatorResult>();
    for (const v of all) {
      if (
        v.username.toLowerCase().includes(ql) ||
        v.fullName.toLowerCase().includes(ql)
      ) {
        const existing = map.get(v.username);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(v.username, { name: v.username, fullName: v.fullName, count: 1 });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  });

  // ── Tag results — distinct tags containing q ──────────────────────────────
  const tagResults = $derived((): string[] => {
    if (ql === '') return [];
    const tagSet = new Set<string>();
    for (const v of all) {
      for (const t of v.tags) {
        if (t.toLowerCase().includes(ql)) {
          tagSet.add(t);
        }
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  });

  // ── Tool results ──────────────────────────────────────────────────────────
  const toolResults = $derived(
    ql === ''
      ? ([] as ToolRecord[])
      : allTools.filter(
          (t) =>
            t.name.toLowerCase().includes(ql) ||
            t.description.toLowerCase().includes(ql) ||
            t.type.toLowerCase().includes(ql)
        )
  );

  // ── Totals for summary ────────────────────────────────────────────────────
  const totalResults = $derived(
    videoResults.length +
      creatorResults().length +
      tagResults().length +
      toolResults.length
  );

  const hasResults = $derived(totalResults > 0);

  // ── Search box submits navigate to new URL ────────────────────────────────
  function handleSubmit(newQ: string) {
    goto('/search?q=' + encodeURIComponent(newQ.trim()));
  }
</script>

<svelte:head>
  <title>{q ? `"${q}" — Search` : 'Search'} — Dopamine</title>
</svelte:head>

<div class="search-page">
  <!-- Header with inline search box -->
  <header class="page-header">
    <div class="header-top">
      <h1 class="page-title">Search</h1>
      {#if q && loaded}
        <p class="summary" role="status" aria-live="polite">
          {#if hasResults}
            <strong>{totalResults}</strong> result{totalResults === 1 ? '' : 's'} for
            <em class="query-echo">{q}</em>
          {:else}
            No results for <em class="query-echo">{q}</em>
          {/if}
        </p>
      {/if}
    </div>
    <div class="search-bar">
      <SearchBox initialValue={q} onSubmit={handleSubmit} />
    </div>
  </header>

  <!-- Loading state — wait for index -->
  {#if !loaded}
    <Spinner label="Loading index…" />

  <!-- Empty query state -->
  {:else if ql === ''}
    <EmptyState
      icon="⌕"
      message="Type something above to search across videos, creators, tags, and tools."
    />

  <!-- No results state -->
  {:else if !hasResults}
    <EmptyState
      icon="○"
      message={`No results for "${q}". Try a different keyword.`}
    />

  {:else}
    <div class="results">

      <!-- ── Videos ──────────────────────────────────────────────────── -->
      {#if videoResults.length > 0}
        <section class="result-group" aria-labelledby="videos-heading">
          <div class="group-header">
            <h2 id="videos-heading" class="group-title">Videos</h2>
            <span class="group-count">{videoResults.length}</span>
          </div>
          <VideoGrid items={videoResults} />
        </section>
      {/if}

      <!-- ── Creators ────────────────────────────────────────────────── -->
      {#if creatorResults().length > 0}
        <section class="result-group" aria-labelledby="creators-heading">
          <div class="group-header">
            <h2 id="creators-heading" class="group-title">Creators</h2>
            <span class="group-count">{creatorResults().length}</span>
          </div>
          <ul class="creator-list" role="list">
            {#each creatorResults() as creator (creator.name)}
              <li class="creator-item">
                <CreatorLink name={creator.name} fullName={creator.fullName} />
                {#if creator.fullName && creator.fullName !== creator.name}
                  <span class="creator-fullname">{creator.fullName}</span>
                {/if}
                <span class="creator-video-count">
                  {creator.count} {creator.count === 1 ? 'video' : 'videos'}
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <!-- ── Tags ───────────────────────────────────────────────────── -->
      {#if tagResults().length > 0}
        <section class="result-group" aria-labelledby="tags-heading">
          <div class="group-header">
            <h2 id="tags-heading" class="group-title">Tags</h2>
            <span class="group-count">{tagResults().length}</span>
          </div>
          <div class="chip-cloud" role="list" aria-label="Matching tags">
            {#each tagResults() as tag (tag)}
              <div role="listitem">
                <TagChip {tag} size="md" />
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- ── Tools ──────────────────────────────────────────────────── -->
      {#if toolResults.length > 0}
        <section class="result-group" aria-labelledby="tools-heading">
          <div class="group-header">
            <h2 id="tools-heading" class="group-title">Tools</h2>
            <span class="group-count">{toolResults.length}</span>
          </div>
          <ul class="tool-list" role="list">
            {#each toolResults as tool (tool.name + tool.videoId)}
              <li class="tool-item">
                <div class="tool-header">
                  <div class="tool-name-row">
                    {#if tool.url}
                      <a
                        href={tool.url}
                        class="tool-name"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tool.url}
                      >{tool.name}</a>
                    {:else}
                      <span class="tool-name">{tool.name}</span>
                    {/if}
                    <span class="tool-type">{tool.type}</span>
                    {#if tool.urlStatus === 'live'}
                      <span class="status-dot status-live" title="URL is live" aria-label="Live"></span>
                    {:else if tool.urlStatus === 'dead'}
                      <span class="status-dot status-dead" title="URL is unreachable" aria-label="Dead"></span>
                    {/if}
                  </div>
                  {#if tool.category}
                    <CategoryChip cat={tool.category} size="sm" />
                  {/if}
                </div>
                {#if tool.description}
                  <p class="tool-desc">{tool.description}</p>
                {/if}
                {#if tool.videoId}
                  <div class="tool-source">
                    <span class="tool-source-label">from</span>
                    <a href={`/video/${encodeURIComponent(tool.videoId)}`} class="tool-video-link">
                      {tool.videoTitle || tool.videoId}
                    </a>
                    {#if tool.username}
                      <span class="tool-source-sep" aria-hidden="true">·</span>
                      <CreatorLink name={tool.username} />
                    {/if}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

    </div>
  {/if}
</div>

<style>
  .search-page {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: var(--maxw);
    margin: 0 auto;
    width: 100%;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .header-top {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
  }

  .page-title {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
    flex-shrink: 0;
  }

  .summary {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
    line-height: 1.4;
  }

  .query-echo {
    font-style: normal;
    color: var(--accent);
  }

  .search-bar {
    max-width: 600px;
  }

  /* ── Results container ───────────────────────────────────────────────────── */
  .results {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* ── Group sections ──────────────────────────────────────────────────────── */
  .result-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  .group-title {
    margin: 0;
    font-size: var(--fs-3);
    font-weight: 600;
    color: var(--text);
    line-height: 1.2;
  }

  .group-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    padding: 1px 7px;
    border-radius: var(--radius-pill);
    background: var(--elevated);
    border: 1px solid var(--border);
    font-size: var(--fs-0);
    font-weight: 600;
    color: var(--muted);
    line-height: 1.6;
  }

  /* ── Creator list ────────────────────────────────────────────────────────── */
  .creator-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .creator-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    flex-wrap: wrap;
    transition: background var(--t-fast);
  }

  .creator-item:hover {
    background: var(--elevated);
  }

  .creator-fullname {
    font-size: var(--fs-1);
    color: var(--muted);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .creator-video-count {
    font-size: var(--fs-0);
    color: var(--faint);
    margin-left: auto;
    white-space: nowrap;
  }

  /* ── Tag chip cloud ──────────────────────────────────────────────────────── */
  .chip-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* ── Tool list ───────────────────────────────────────────────────────────── */
  .tool-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tool-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: background var(--t-fast);
  }

  .tool-item:hover {
    background: var(--elevated);
  }

  .tool-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .tool-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tool-name {
    font-size: var(--fs-2);
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
    line-height: 1.3;
  }

  a.tool-name:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .tool-type {
    font-size: var(--fs-0);
    color: var(--faint);
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 1px 7px;
    white-space: nowrap;
  }

  .status-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-live {
    background: var(--ok);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ok) 20%, transparent);
  }

  .status-dead {
    background: var(--bad);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--bad) 20%, transparent);
  }

  .tool-desc {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
    line-height: 1.5;
  }

  .tool-source {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 2px;
  }

  .tool-source-label {
    font-size: var(--fs-0);
    color: var(--faint);
  }

  .tool-video-link {
    font-size: var(--fs-0);
    color: var(--accent);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 280px;
  }

  .tool-video-link:hover {
    text-decoration: underline;
  }

  .tool-source-sep {
    color: var(--faint);
    font-size: var(--fs-0);
  }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .search-page {
      gap: 24px;
    }

    .page-title {
      font-size: var(--fs-3);
    }

    .header-top {
      flex-direction: column;
      gap: 6px;
    }

    .search-bar {
      max-width: 100%;
    }

    .results {
      gap: 28px;
    }

    .creator-item {
      padding: 10px 12px;
    }

    .tool-item {
      padding: 12px 12px;
    }

    .tool-video-link {
      max-width: 180px;
    }
  }
</style>
