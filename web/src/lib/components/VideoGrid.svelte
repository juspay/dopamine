<script lang="ts">
  import type { IndexRecord } from '$lib/types.js';
  import VideoCard from './VideoCard.svelte';
  import EmptyState from './EmptyState.svelte';

  interface Props {
    items: IndexRecord[];
    emptyMessage?: string;
  }

  const { items, emptyMessage = 'No videos found.' }: Props = $props();

  const BATCH = 48;

  let visible = $state(BATCH);

  // Reset visible count when items list changes
  $effect(() => {
    void items;
    visible = BATCH;
  });

  const shown = $derived(items.slice(0, visible));
  const hasMore = $derived(visible < items.length);

  let sentinel: HTMLElement | undefined = $state();

  $effect(() => {
    if (!sentinel || !hasMore) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          visible = Math.min(visible + BATCH, items.length);
        }
      },
      { rootMargin: '200px' }
    );

    io.observe(sentinel);
    return () => io.disconnect();
  });
</script>

{#if items.length === 0}
  <EmptyState message={emptyMessage} />
{:else}
  <div class="grid">
    {#each shown as record (record.id)}
      <VideoCard {record} />
    {/each}
  </div>

  {#if hasMore}
    <div bind:this={sentinel} class="sentinel" aria-hidden="true"></div>
  {/if}
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .sentinel {
    height: 1px;
    margin-top: 8px;
  }
</style>
