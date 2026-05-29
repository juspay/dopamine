<script lang="ts">
  import { page } from '$app/stores';
  import { getVideos, isIndexLoaded } from '$lib/data.svelte.js';
  import { catColor, catBg } from '$lib/format.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

  // Decode the category param reactively so navigation between categories works
  const cat = $derived(decodeURIComponent($page.params.cat ?? ''));

  // Reactive: all videos filtered to this category
  const items = $derived(getVideos().filter((v) => v.category === cat));

  // Distinct subcategories present in this category's videos, sorted alphabetically
  const subcategories = $derived(
    [...new Set(items.map((v) => v.subcategory).filter(Boolean))].sort()
  );

  // Active subcategory filter — reset whenever the category route param changes
  let activeSubcat = $state<string | null>(null);
  $effect(() => {
    void cat;
    activeSubcat = null;
  });

  // Filtered items: either all in category, or narrowed by active subcategory
  const filteredItems = $derived(
    activeSubcat ? items.filter((v) => v.subcategory === activeSubcat) : items
  );

  const loaded = $derived(isIndexLoaded());

  const color = $derived(catColor(cat));
  const bg = $derived(catBg(cat));

  const breadcrumbs = $derived([
    { label: 'Home', href: '/' },
    { label: cat }
  ]);

  function toggleSubcat(sub: string) {
    activeSubcat = activeSubcat === sub ? null : sub;
  }
</script>

<div class="page">
  <Breadcrumbs items={breadcrumbs} />

  <header class="cat-header" style="--cat-color:{color};--cat-bg:{bg}">
    <div class="cat-badge">
      <span class="cat-name">{cat}</span>
      {#if loaded}
        <span class="cat-count">{items.length} video{items.length !== 1 ? 's' : ''}</span>
      {/if}
    </div>
  </header>

  {#if subcategories.length > 1}
    <div class="subcat-row" role="group" aria-label="Filter by subcategory">
      <button
        class="subcat-chip"
        class:active={activeSubcat === null}
        onclick={() => { activeSubcat = null; }}
        aria-pressed={activeSubcat === null}
      >
        All
      </button>
      {#each subcategories as sub (sub)}
        <button
          class="subcat-chip"
          class:active={activeSubcat === sub}
          onclick={() => toggleSubcat(sub)}
          aria-pressed={activeSubcat === sub}
        >
          {sub}
          <span class="subcat-count">
            {items.filter((v) => v.subcategory === sub).length}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  {#if !loaded}
    <Spinner size={40} />
  {:else}
    <VideoGrid
      items={filteredItems}
      emptyMessage={activeSubcat
        ? `No videos in "${activeSubcat}" for this category.`
        : `No videos found in "${cat}".`}
    />
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-top: 8px;
  }

  /* ── Category header ────────────────────────────────────────────────────── */

  .cat-header {
    background: var(--cat-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
    display: flex;
    align-items: center;
  }

  .cat-badge {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  .cat-name {
    font-size: var(--fs-4);
    font-weight: 700;
    color: var(--cat-color);
    letter-spacing: -0.5px;
    line-height: 1.2;
  }

  .cat-count {
    font-size: var(--fs-1);
    color: var(--muted);
    font-weight: 400;
  }

  /* ── Subcategory filter row ─────────────────────────────────────────────── */

  .subcat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .subcat-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-1);
    font-weight: 500;
    line-height: 1.6;
    color: var(--muted);
    background: var(--elevated);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: color var(--t-fast), background var(--t-fast), border-color var(--t-fast);
  }

  .subcat-chip:hover {
    color: var(--text);
    border-color: var(--muted);
  }

  .subcat-chip.active {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, var(--elevated));
    border-color: var(--accent);
  }

  .subcat-chip:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .subcat-count {
    font-size: var(--fs-0);
    color: var(--faint);
    font-weight: 400;
  }

  .subcat-chip.active .subcat-count {
    color: var(--accent);
    opacity: 0.7;
  }

  /* ── Responsive ─────────────────────────────────────────────────────────── */

  @media (max-width: 600px) {
    .cat-header {
      padding: 16px;
    }

    .cat-name {
      font-size: var(--fs-3);
    }

    .subcat-row {
      gap: 6px;
    }

    .subcat-chip {
      padding: 3px 10px;
      font-size: var(--fs-0);
    }
  }
</style>
