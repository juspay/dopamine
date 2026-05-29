<script lang="ts">
  import { getById } from '$lib/data.js';
  import { fmtDuration } from '$lib/format.js';
  import type { IndexRecord } from '$lib/types.js';

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
  <div class="rail-wrap">
    <div class="rail">
      {#each records as record}
        <a href={'/video/' + encodeURIComponent(record.id)} class="rail-card" title={record.title}>
          <div class="rail-thumb">
            <img
              src={record.thumb}
              alt={record.title}
              loading="lazy"
              decoding="async"
              onerror={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
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
  </div>
{/if}

<style>
  .rail-wrap {
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
    padding-bottom: 4px;
  }

  .rail-wrap::-webkit-scrollbar {
    height: 4px;
  }

  .rail-wrap::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
  }

  .rail {
    display: flex;
    gap: 12px;
    padding: 2px 0;
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
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
    transform: translateY(-1px);
    text-decoration: none;
  }

  .rail-thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    background: var(--elevated);
    overflow: hidden;
  }

  .rail-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .rail-dur {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 3px;
  }

  .rail-meta {
    padding: 8px;
  }

  .rail-title {
    margin: 0 0 4px;
    font-size: var(--fs-0);
    font-weight: 500;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: var(--text);
  }

  .rail-creator {
    font-size: 11px;
    color: var(--faint);
  }
</style>
