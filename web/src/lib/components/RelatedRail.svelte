<script lang="ts">
  import { getById } from '$lib/data.svelte.js';
  import { fmtDuration } from '$lib/format.js';
  import type { IndexRecord } from '$lib/types.js';
  import { Scroller, Img } from '@juspay/svelte-ui-components';

  interface Props {
    ids: string[];
  }

  const { ids }: Props = $props();

  const records = $derived(
    ids
      .map((id) => getById(id))
      .filter((r): r is IndexRecord => r !== undefined)
  );
</script>

{#if records.length > 0}
  <Scroller direction="horizontal" showArrows dragToScroll hideScrollbar>
    {#snippet children()}
      <div class="rail">
        {#each records as record}
          <a href={'/video/' + encodeURIComponent(record.id)} class="rail-card" title={record.title}>
            <div class="rail-thumb">
              <Img src={record.thumb} alt={record.title} classes="rail-thumb-img" />
              {#if record.durationSec > 0}
                <span class="rail-dur">{fmtDuration(record.durationSec)}</span>
              {/if}
            </div>
            <div class="rail-meta">
              <p class="rail-title">{record.title}</p>
              <span class="rail-creator">@{record.username}</span>
            </div>
          </a>
        {/each}
      </div>
    {/snippet}
  </Scroller>
{/if}

<style>
  .rail {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-1) 0;
    width: max-content;
  }

  .rail-card {
    display: flex;
    flex-direction: column;
    width: 180px;
    flex-shrink: 0;
    text-decoration: none;
    color: var(--text);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    transition: border-color var(--t-fast), transform var(--t-fast);
  }

  .rail-card:hover {
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); /* intentional: 40% hover accent is distinct from --accent-subtle (12%) */
    transform: translateY(-1px);
    text-decoration: none;
  }

  .rail-thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    background: var(--elevated);
    overflow: hidden;
    /* Size the library <Img> (defaults to 24x24) to fill the 16:9 frame.
       Vars win because the library's own scoped `img` rule reads them. */
    --image-width: 100%;
    --image-height: 100%;
    --image-object-fit: cover;
  }

  .rail-thumb :global(.rail-thumb-img) {
    display: block;
  }

  .rail-dur {
    position: absolute;
    bottom: var(--space-1);
    right: var(--space-1);
    background: var(--scrim);
    color: var(--text);
    font-size: var(--fs-0);
    font-weight: var(--fw-semibold);
    padding: 1px var(--space-1);
    border-radius: var(--radius-xs);
  }

  .rail-meta {
    padding: var(--space-2);
  }

  .rail-title {
    margin: 0 0 var(--space-1);
    font-size: var(--fs-0);
    font-weight: var(--fw-medium);
    line-height: var(--lh-normal);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: var(--text);
  }

  .rail-creator {
    font-size: var(--fs-0);
    color: var(--faint);
  }
</style>
