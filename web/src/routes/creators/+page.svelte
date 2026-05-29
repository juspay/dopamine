<script lang="ts">
  import { loadFacets, getFacets } from '$lib/data.svelte.js';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { Avatar } from '@juspay/svelte-ui-components';

  $effect(() => {
    loadFacets();
  });

  const facets = $derived(getFacets());
  const creators = $derived(facets?.creators ?? []);

  let query = $state('');
  const filtered = $derived(
    query.trim()
      ? creators.filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            (c.fullName ?? '').toLowerCase().includes(query.toLowerCase())
        )
      : creators
  );
</script>

<svelte:head><title>Creators — Dopamine</title></svelte:head>

<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Creators' }]} />

<header class="head">
  <h1 class="title">Creators</h1>
  {#if facets}<span class="count">{creators.length}</span>{/if}
</header>

<div class="search">
  <input
    class="search-input"
    type="search"
    placeholder="Search creators…"
    bind:value={query}
    aria-label="Search creators"
  />
</div>

{#if facets === null}
  <Spinner />
{:else if filtered.length === 0}
  <EmptyState message={query ? `No creators match “${query}”.` : 'No creators yet.'} />
{:else}
  <div class="grid">
    {#each filtered as c (c.name)}
      <a class="creator-card" href={'/creator/' + encodeURIComponent(c.name)}>
        <Avatar name={c.name} alt={c.name} size="medium" />
        <span class="info">
          <span class="name">@{c.name}</span>
          {#if c.fullName}<span class="full">{c.fullName}</span>{/if}
        </span>
        <span class="count-badge">{c.count}</span>
      </a>
    {/each}
  </div>
{/if}

<style>
  .head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin: 8px 0 20px;
  }
  .title {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: 700;
  }
  .count {
    font-size: var(--fs-2);
    color: var(--muted);
  }
  .search {
    margin-bottom: 24px;
  }
  .search-input {
    width: 100%;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    color: var(--text);
    font-size: var(--fs-1);
  }
  .search-input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }
  .creator-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    text-decoration: none;
    transition: border-color var(--t), transform var(--t);
  }
  .creator-card:hover {
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
    transform: translateY(-1px);
    text-decoration: none;
  }
  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .name {
    font-weight: 600;
    font-size: var(--fs-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .full {
    font-size: var(--fs-0);
    color: var(--faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .count-badge {
    flex-shrink: 0;
    font-size: var(--fs-0);
    color: var(--muted);
    background: var(--elevated);
    padding: 2px 8px;
    border-radius: var(--radius-pill);
  }
</style>
