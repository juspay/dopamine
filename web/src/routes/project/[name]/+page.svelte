<script lang="ts">
  import { page } from '$app/stores';
  import { getVideos, isIndexLoaded, loadBriefs, getBriefs, getById } from '$lib/data.svelte.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

  const name = $derived(decodeURIComponent($page.params.name ?? ''));

  $effect(() => { loadBriefs(); });

  const all = $derived(getVideos());
  const loaded = $derived(isIndexLoaded());

  const items = $derived(
    all.filter((v) => (v.appliesTo ?? []).some((p) => p.toLowerCase() === name.toLowerCase()))
  );

  // Synthesized action brief for this project (case-insensitive key match).
  const brief = $derived(
    Object.entries(getBriefs()).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] ?? null
  );

  // Resolve a source-learning id to a human title for the "Based on" links.
  const titleOf = $derived((id: string) => getById(id)?.title ?? id);

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

  {#if loaded && brief && brief.actions.length}
    <section class="actions">
      <h2 class="actions-title">Actions to try</h2>
      <ol class="action-list">
        {#each brief.actions as action}
          <li class="action">
            <p class="action-head">{action.title}</p>
            <p class="action-detail">{action.detail}</p>
            {#if action.basedOn.length}
              <p class="based-on">
                Based on:
                {#each action.basedOn as id, i}<a class="based-link" href={'/video/' + encodeURIComponent(id)}>{titleOf(id)}</a>{i < action.basedOn.length - 1 ? ', ' : ''}{/each}
              </p>
            {/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  {#if !loaded}
    <Spinner />
  {:else}
    <h2 class="learnings-title">Learnings</h2>
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

  .actions {
    border: 1px solid var(--border, rgba(128, 128, 128, 0.25));
    border-radius: var(--radius-lg, 12px);
    padding: var(--space-4);
    background: var(--elevated, rgba(128, 128, 128, 0.06));
  }

  .actions-title,
  .learnings-title {
    font-size: var(--font-lg, 1.1rem);
    font-weight: 700;
    margin: 0 0 var(--space-3) 0;
  }

  .learnings-title {
    margin-top: var(--space-2);
  }

  .action-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    padding-left: 1.4em;
  }

  .action {
    line-height: 1.45;
  }

  .action-head {
    font-weight: 600;
    margin: 0 0 2px 0;
  }

  .action-detail {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .based-on {
    font-size: var(--font-sm);
    color: var(--color-text-secondary);
    margin: 4px 0 0 0;
  }

  .based-link {
    color: var(--accent, #6ea8fe);
    text-decoration: none;
  }

  .based-link:hover {
    text-decoration: underline;
  }
</style>
