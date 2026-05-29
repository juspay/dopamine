<script lang="ts">
  import type { IndexRecord } from '$lib/types.js';
  import { fmtDuration, fmtDate, fmtNumber } from '$lib/format.js';
  import CategoryChip from './CategoryChip.svelte';
  import TagChip from './TagChip.svelte';
  import CreatorLink from './CreatorLink.svelte';
  import VerificationBadge from './VerificationBadge.svelte';
  import { Img } from '@juspay/svelte-ui-components';

  interface Props {
    record: IndexRecord;
  }

  const { record }: Props = $props();

  const visibleTags = $derived(record.tags.slice(0, 5));
  const duration = $derived(fmtDuration(record.durationSec));
  const date = $derived(fmtDate(record.date));
  const likes = $derived(fmtNumber(record.likes));
</script>

<!--
  Stretched-link pattern: the card itself is an <article> (not an <a>), so the
  interactive chips/links inside remain valid, independently-clickable anchors.
  The title link's ::after overlay covers the whole card to make the rest of the
  card navigate to the video. Sub-links sit above it via z-index.
-->
<article class="video-card">
  <div class="thumb-wrap">
    <Img src={record.thumb} alt={record.title} classes="thumb-img" />

    <div class="overlay-cat">
      <CategoryChip cat={record.category} />
    </div>

    {#if record.durationSec > 0}
      <div class="overlay-dur">{duration}</div>
    {/if}
  </div>

  <div class="card-body">
    <h3 class="title">
      <a class="title-link" href={'/video/' + encodeURIComponent(record.id)}>{record.title}</a>
    </h3>

    <div class="meta-row">
      <CreatorLink name={record.username} fullName={record.fullName} />
    </div>

    {#if visibleTags.length > 0}
      <div class="tags-row">
        {#each visibleTags as tag}
          <TagChip {tag} />
        {/each}
      </div>
    {/if}

    <div class="footer-row">
      <span class="footer-meta">{date}</span>
      {#if record.likes > 0}
        <span class="footer-meta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:middle;opacity:0.6">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          {likes}
        </span>
      {/if}
      <VerificationBadge score={record.verification} confidence={record.confidence} size="dot" />
    </div>
  </div>
</article>

<style>
  .video-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    color: var(--text);
    transition: transform var(--t), border-color var(--t), box-shadow var(--t);
  }

  .video-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
    box-shadow: var(--shadow);
  }

  /* 16:9 thumbnail */
  .thumb-wrap {
    position: relative;
    aspect-ratio: 16 / 9;
    background: var(--elevated);
    overflow: hidden;
    flex-shrink: 0;
    /* Size the library <Img> (defaults to 24x24) to fill the 16:9 frame */
    --image-width: 100%;
    --image-height: 100%;
    --image-object-fit: cover;
  }

  .thumb-wrap :global(.thumb-img) {
    display: block;
    transition: transform var(--t);
  }

  .video-card:hover :global(.thumb-img) {
    transform: scale(1.03);
  }

  /* Category overlay sits above the stretched link so it stays clickable */
  .overlay-cat {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2;
  }

  .overlay-dur {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: var(--fs-0);
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1.4;
    backdrop-filter: blur(4px);
  }

  .card-body {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .title {
    margin: 0;
    font-size: var(--fs-1);
    font-weight: 600;
    line-height: 1.4;
  }

  .title-link {
    color: var(--text);
    text-decoration: none;
    /* 2-line clamp */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Stretched link — covers the whole card so empty areas navigate to the video */
  .title-link::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .video-card:hover .title-link {
    color: var(--accent);
  }

  /* Interactive sub-links sit above the stretched link */
  .meta-row,
  .tags-row {
    position: relative;
    z-index: 1;
  }

  .meta-row {
    display: flex;
    align-items: center;
  }

  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .footer-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: auto;
    padding-top: 4px;
  }

  .footer-meta {
    font-size: var(--fs-0);
    color: var(--faint);
    display: flex;
    align-items: center;
    gap: 3px;
  }
</style>
