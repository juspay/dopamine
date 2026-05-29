<script lang="ts">
  import { page } from '$app/stores';
  import { getVideos, isIndexLoaded } from '$lib/data.svelte.js';
  import { fmtNumber } from '$lib/format.js';
  import VideoGrid from '$lib/components/VideoGrid.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  const name = $derived($page.params.name);

  const all = $derived(getVideos());
  const loaded = $derived(isIndexLoaded());

  const mine = $derived(all.filter((v) => v.username === name));

  // Derive creator display info from first matching record
  const fullName = $derived(mine[0]?.fullName ?? '');
  const videoCount = $derived(mine.length);
  const totalLikes = $derived(mine.reduce((acc, v) => acc + (v.likes ?? 0), 0));

  const breadcrumbs = $derived([
    { label: 'Home', href: '/' },
    { label: `@${name}` }
  ]);
</script>

<svelte:head>
  <title>@{name} — Dopamine</title>
</svelte:head>

<div class="creator-page">
  <Breadcrumbs items={breadcrumbs} />

  <header class="page-header">
    <div class="identity">
      <h1 class="handle">
        <span class="at" aria-hidden="true">@</span>{name}
      </h1>
      {#if fullName}
        <p class="full-name">{fullName}</p>
      {/if}
    </div>

    {#if loaded && videoCount > 0}
      <dl class="stats">
        <div class="stat">
          <dt class="stat-label">Videos</dt>
          <dd class="stat-value">{fmtNumber(videoCount)}</dd>
        </div>
        <div class="stat">
          <dt class="stat-label">Total likes</dt>
          <dd class="stat-value">{fmtNumber(totalLikes)}</dd>
        </div>
      </dl>
    {/if}
  </header>

  {#if !loaded}
    <Spinner />
  {:else if mine.length === 0}
    <EmptyState message={`No videos found for @${name}.`} />
  {:else}
    <VideoGrid items={mine} emptyMessage={`No videos found for @${name}.`} />
  {/if}
</div>

<style>
  .creator-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .handle {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }

  .at {
    color: var(--accent);
    margin-right: 1px;
  }

  .full-name {
    margin: 0;
    font-size: var(--fs-2);
    color: var(--muted);
  }

  .stats {
    display: flex;
    gap: 24px;
    margin: 0;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    flex-shrink: 0;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-label {
    font-size: var(--fs-0);
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .stat-value {
    margin: 0;
    font-size: var(--fs-3);
    font-weight: 700;
    color: var(--text);
    line-height: 1;
  }

  @media (max-width: 640px) {
    .page-header {
      flex-direction: column;
      gap: 12px;
    }

    .handle {
      font-size: var(--fs-3);
    }

    .stats {
      width: 100%;
      justify-content: space-around;
    }
  }
</style>
