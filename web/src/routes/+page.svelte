<script lang="ts">
  import {
    getVideos,
    isIndexLoaded,
    getFacets,
    getTools,
    loadFacets,
    loadTools
  } from '$lib/data.svelte.js';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import CreatorLink from '$lib/components/CreatorLink.svelte';
  import TagChip from '$lib/components/TagChip.svelte';
  import VerificationBadge from '$lib/components/VerificationBadge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

  // Kick off facets + tools loads once on mount
  $effect(() => {
    loadFacets();
    loadTools();
  });

  // Reactive data slices
  const indexLoaded = $derived(isIndexLoaded());
  const facets = $derived(getFacets());
  const allVideos = $derived(getVideos());
  const tools = $derived(getTools());

  // 12 highest-quality learnings — leads the page so the first thing seen is
  // the best, most-applicable content, not whatever was saved last. Thin
  // (unprocessed/empty) learnings are excluded. Ordered tier-first (applicable
  // learnings ahead of merely well-analyzed ones), matching the data builder.
  const TIER_RANK: Record<string, number> = { featured: 0, standard: 1, thin: 2 };
  const topLearnings = $derived(
    [...allVideos]
      .filter((v) => v.tier !== 'thin')
      .sort((a, b) =>
        (TIER_RANK[a.tier] - TIER_RANK[b.tier]) ||
        (b.quality - a.quality) ||
        (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      .slice(0, 12)
  );

  // 12 newest videos sorted by date desc
  const recentVideos = $derived(
    [...allVideos]
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      .slice(0, 12)
  );

  // Top 10 creators
  const topCreators = $derived((facets?.creators ?? []).slice(0, 10));

  // Top 20 tags
  const trendingTags = $derived((facets?.tags ?? []).slice(0, 20));

  // Top 6 verified tools (prefer verified_useful first)
  const peekTools = $derived(
    [...tools]
      .sort((a, b) => {
        const rank = (v: string) =>
          v === 'verified_useful' ? 0 : v === 'partially_verified' ? 1 : 2;
        return rank(a.verification) - rank(b.verification);
      })
      .slice(0, 6)
  );

  const categories = $derived(facets?.categories ?? []);
</script>

<!-- ── Hero / Search ─────────────────────────────────────────────── -->
<section class="hero">
  <h1 class="hero-title">Dopamine</h1>
  <p class="hero-sub">Discover curated AI & tech content, verified tools, and creator insights.</p>
  <div class="search-wrap">
    <SearchBox placeholder="Search videos, tools, creators…" />
  </div>
</section>

<!-- ── Category tiles ────────────────────────────────────────────── -->
<section class="section">
  <div class="section-header">
    <h2 class="section-title">Browse by Category</h2>
  </div>

  {#if facets === null}
    <Spinner />
  {:else if categories.length === 0}
    <p class="empty-hint">No categories yet.</p>
  {:else}
    <div class="cat-grid">
      {#each categories as cat (cat.name)}
        <a
          class="cat-tile"
          href={'/category/' + encodeURIComponent(cat.name)}
          style="color:{cat.color};background:{cat.bg}"
        >
          <span class="cat-name">{cat.name}</span>
          <span class="cat-count">{cat.count} video{cat.count !== 1 ? 's' : ''}</span>
        </a>
      {/each}
    </div>
  {/if}
</section>

<!-- ── Top learnings (quality-first) ─────────────────────────────── -->
<section class="section">
  <div class="section-header">
    <h2 class="section-title">Top learnings</h2>
    <a class="see-all" href="/videos">See all videos →</a>
  </div>

  {#if !indexLoaded}
    <Spinner />
  {:else if topLearnings.length === 0}
    <p class="empty-hint">No learnings found.</p>
  {:else}
    <VideoGrid items={topLearnings} emptyMessage="No learnings yet." />
  {/if}
</section>

<!-- ── Recent videos ─────────────────────────────────────────────── -->
<section class="section">
  <div class="section-header">
    <h2 class="section-title">Recently added</h2>
    <a class="see-all" href="/videos?sort=date-desc">See all videos →</a>
  </div>

  {#if !indexLoaded}
    <Spinner />
  {:else if recentVideos.length === 0}
    <p class="empty-hint">No videos found.</p>
  {:else}
    <VideoGrid items={recentVideos} emptyMessage="No recent videos." />
  {/if}
</section>

<!-- ── Top creators ──────────────────────────────────────────────── -->
<section class="section">
  <div class="section-header">
    <h2 class="section-title">Top Creators</h2>
    <a class="see-all" href="/creators">See all →</a>
  </div>

  {#if facets === null}
    <Spinner size={20} />
  {:else if topCreators.length === 0}
    <p class="empty-hint">No creators yet.</p>
  {:else}
    <div class="creators-row">
      {#each topCreators as creator (creator.name)}
        <div class="creator-chip">
          <CreatorLink name={creator.name} fullName={creator.fullName} />
          <span class="creator-count">{creator.count}</span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<!-- ── Trending tags ─────────────────────────────────────────────── -->
<section class="section">
  <div class="section-header">
    <h2 class="section-title">Trending Tags</h2>
  </div>

  {#if facets === null}
    <Spinner size={20} />
  {:else if trendingTags.length === 0}
    <p class="empty-hint">No tags yet.</p>
  {:else}
    <div class="tags-wrap">
      {#each trendingTags as t (t.name)}
        <TagChip tag={t.name} />
      {/each}
    </div>
  {/if}
</section>

<!-- ── Verified tools peek ───────────────────────────────────────── -->
<section class="section">
  <div class="section-header">
    <h2 class="section-title">Verified Tools</h2>
    <a class="see-all" href="/tools">See all tools →</a>
  </div>

  {#if tools.length === 0 && facets !== null}
    <!-- facets loaded but tools empty — might still be loading -->
    <Spinner size={20} />
  {:else if peekTools.length === 0}
    <p class="empty-hint">No tools indexed yet.</p>
  {:else}
    <div class="tools-table">
      {#each peekTools as tool (tool.name + tool.videoId)}
        <div class="tool-row">
          <div class="tool-main">
            {#if tool.url}
              <a class="tool-name" href={tool.url} target="_blank" rel="noopener noreferrer">
                {tool.name}
              </a>
            {:else}
              <span class="tool-name tool-name--plain">{tool.name}</span>
            {/if}
            <span class="tool-type">{tool.type}</span>
          </div>
          <div class="tool-meta">
            <VerificationBadge score={tool.verification} size="badge" />
            <a class="tool-source" href={'/video/' + encodeURIComponent(tool.videoId)}>
              {tool.videoTitle.length > 48
                ? tool.videoTitle.slice(0, 48) + '…'
                : tool.videoTitle}
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  /* ── Hero ────────────────────────────────────────────────────── */
  .hero {
    text-align: center;
    padding: 48px 0 40px;
  }

  .hero-title {
    font-size: var(--fs-5);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    color: var(--text);
    background: linear-gradient(135deg, var(--text) 60%, var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-sub {
    font-size: var(--fs-2);
    color: var(--muted);
    margin: 0 0 28px;
  }

  .search-wrap {
    max-width: 560px;
    margin: 0 auto;
  }

  /* ── Section shell ───────────────────────────────────────────── */
  .section {
    margin-top: 52px;
  }

  .section-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .section-title {
    font-size: var(--fs-3);
    font-weight: 600;
    margin: 0;
    color: var(--text);
  }

  .see-all {
    font-size: var(--fs-1);
    color: var(--accent);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .empty-hint {
    color: var(--faint);
    font-size: var(--fs-1);
    margin: 0;
    padding: 24px 0;
  }

  /* ── Category grid ───────────────────────────────────────────── */
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .cat-tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
    border-radius: var(--radius);
    text-decoration: none;
    border: 1px solid transparent;
    transition: filter var(--t-fast), border-color var(--t-fast), transform var(--t-fast);
  }

  .cat-tile:hover {
    text-decoration: none;
    filter: brightness(1.15);
    border-color: currentColor;
    transform: translateY(-1px);
  }

  .cat-name {
    font-size: var(--fs-1);
    font-weight: 600;
    line-height: 1.3;
  }

  .cat-count {
    font-size: var(--fs-0);
    opacity: 0.7;
  }

  /* ── Creators ────────────────────────────────────────────────── */
  .creators-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .creator-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    transition: border-color var(--t-fast);
  }

  .creator-chip:hover {
    border-color: var(--accent);
  }

  .creator-count {
    font-size: var(--fs-0);
    color: var(--faint);
    font-weight: 500;
  }

  /* ── Tags ────────────────────────────────────────────────────── */
  .tags-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* ── Tools table ─────────────────────────────────────────────── */
  .tools-table {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .tool-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    transition: background var(--t-fast);
  }

  .tool-row:last-child {
    border-bottom: none;
  }

  .tool-row:hover {
    background: var(--elevated);
  }

  .tool-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .tool-name {
    font-size: var(--fs-1);
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tool-name--plain {
    color: var(--text);
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

  .tool-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .tool-source {
    font-size: var(--fs-0);
    color: var(--muted);
    max-width: 280px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tool-source:hover {
    color: var(--text);
  }

  /* ── Mobile ──────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .hero {
      padding: 32px 0 28px;
    }

    .hero-title {
      font-size: var(--fs-4);
    }

    .section {
      margin-top: 40px;
    }

    .cat-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }

    .tool-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .tool-meta {
      flex-wrap: wrap;
    }

    .tool-source {
      max-width: 100%;
    }
  }
</style>
