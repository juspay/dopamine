<script lang="ts">
  import { page } from '$app/stores';
  import { getVideos, isIndexLoaded } from '$lib/data.svelte.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

  const tag = $derived(decodeURIComponent($page.params.tag ?? ''));

  const all = $derived(getVideos());
  const loaded = $derived(isIndexLoaded());

  const items = $derived(
    all.filter((v) => v.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
  );

  const breadcrumbs = $derived([
    { label: 'Home', href: '/' },
    { label: `#${tag}` }
  ]);
</script>

<svelte:head>
  <title>#{tag} — Dopamine</title>
</svelte:head>

<div class="tag-page">
  <Breadcrumbs items={breadcrumbs} />

  <header class="page-header">
    <h1 class="tag-heading">
      <span class="hash" aria-hidden="true">#</span>{tag}
    </h1>
    {#if loaded}
      <p class="count">{items.length} {items.length === 1 ? 'video' : 'videos'}</p>
    {/if}
  </header>

  {#if !loaded}
    <Spinner />
  {:else}
    <VideoGrid {items} emptyMessage={`No videos tagged #${tag}.`} />
  {/if}
</div>

<style>
  .tag-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    max-width: var(--content-max);
    margin: 0 auto;
    width: 100%;
  }

  .page-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .tag-heading {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: var(--fw-bold);
    color: var(--text);
    line-height: var(--lh-tight);
  }

  .hash {
    color: var(--accent);
    margin-right: 2px;
  }

  .count {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
  }

  @media (max-width: 640px) {
    .tag-page {
      padding: var(--space-3);
    }

    .tag-heading {
      font-size: var(--fs-3);
    }

    .page-header {
      flex-direction: column;
      gap: var(--space-1);
    }
  }
</style>
