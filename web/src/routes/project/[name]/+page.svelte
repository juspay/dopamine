<script lang="ts">
  import { page } from '$app/stores';
  import { getVideos, isIndexLoaded } from '$lib/data.svelte.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

  const name = $derived(decodeURIComponent($page.params.name ?? ''));

  const all = $derived(getVideos());
  const loaded = $derived(isIndexLoaded());

  const items = $derived(
    all.filter((v) => (v.appliesTo ?? []).some((p) => p.toLowerCase() === name.toLowerCase()))
  );

  const breadcrumbs = $derived([
    { label: 'Home', href: '/' },
    { label: `→ ${name}` }
  ]);
</script>

<svelte:head>
  <title>{name} — Dopamine</title>
</svelte:head>

<div class="project-page">
  <Breadcrumbs items={breadcrumbs} />

  <header class="page-header">
    <h1 class="project-heading">
      <span class="arrow" aria-hidden="true">→</span> {name}
    </h1>
    {#if loaded}
      <p class="count">{items.length} {items.length === 1 ? 'learning' : 'learnings'}</p>
    {/if}
  </header>

  {#if !loaded}
    <Spinner />
  {:else}
    <VideoGrid {items} emptyMessage={`No learnings mapped to ${name}.`} />
  {/if}
</div>

<style>
  .project-page {
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
  }

  .project-heading {
    font-size: var(--font-2xl);
    font-weight: 700;
    margin: 0;
  }

  .arrow {
    opacity: 0.5;
  }

  .count {
    color: var(--color-text-secondary);
    font-size: var(--font-sm);
    margin: 0;
  }
</style>
