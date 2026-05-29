<script lang="ts">
  import { page } from '$app/stores';
  import { loadDetail } from '$lib/data.svelte.js';
  import { fmtDate, fmtNumber, fmtDuration, igUrl } from '$lib/format.js';
  import type { VideoDetail, LinkItem } from '$lib/types.js';

  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import CreatorLink from '$lib/components/CreatorLink.svelte';
  import CategoryChip from '$lib/components/CategoryChip.svelte';
  import TagChip from '$lib/components/TagChip.svelte';
  import SectionNav from '$lib/components/SectionNav.svelte';
  import ActionableItem from '$lib/components/ActionableItem.svelte';
  import VerificationBadge from '$lib/components/VerificationBadge.svelte';
  import RelatedRail from '$lib/components/RelatedRail.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  const id = $derived(decodeURIComponent($page.params.id ?? ''));

  let detail = $state<VideoDetail | null>(null);
  let loading = $state(true);
  let notFound = $state(false);

  $effect(() => {
    const currentId = id;
    loading = true;
    notFound = false;
    detail = null;

    loadDetail(currentId).then((d) => {
      detail = d;
      loading = false;
      if (!d) notFound = true;
    });
  });

  const breadcrumbs = $derived(
    detail
      ? [
          { label: 'Home', href: '/' },
          { label: detail.category, href: `/category/${encodeURIComponent(detail.category)}` },
          { label: detail.title }
        ]
      : [{ label: 'Home', href: '/' }, { label: 'Video' }]
  );

  const sections = [
    { id: 'takeaways', label: 'Takeaways' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'onscreen', label: 'On-screen' },
    { id: 'tools', label: 'Tools' },
    { id: 'links', label: 'Links' }
  ];
</script>

<svelte:head>
  <title>{detail ? `${detail.title} — Dopamine` : 'Video — Dopamine'}</title>
</svelte:head>

<div class="video-page">
  <Breadcrumbs items={breadcrumbs} />

  {#if loading}
    <Spinner />
  {:else if notFound || !detail}
    <EmptyState message="This video could not be found." icon="◌" />
  {:else}
    <div class="layout">
      <!-- ── Main column ── -->
      <div class="main">
        <h1 class="title">{detail.title}</h1>

        <!-- Meta row -->
        <div class="meta-row">
          <CreatorLink name={detail.username} fullName={detail.fullName} />
          <CategoryChip cat={detail.category} />
          {#if detail.code}
            <a
              href={igUrl(detail.code)}
              target="_blank"
              rel="noopener noreferrer"
              class="ig-link"
              aria-label="Open Instagram reel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              Instagram
            </a>
          {/if}
          <span class="meta-sep" aria-hidden="true">·</span>
          <span class="meta-item">{fmtDate(detail.date)}</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <span class="meta-item">{fmtNumber(detail.likes)} likes</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <span class="meta-item">{fmtDuration(detail.durationSec)}</span>
        </div>

        <!-- Tags -->
        {#if detail.tags.length > 0}
          <div class="tags-row" aria-label="Tags">
            {#each detail.tags as tag}
              <TagChip {tag} />
            {/each}
          </div>
        {/if}

        <!-- Video or thumbnail -->
        <div class="media-wrap">
          {#if detail.videoPath}
            <video
              class="video-player"
              controls
              preload="metadata"
              src={detail.videoPath}
              poster={detail.thumb}
              aria-label={detail.title}
            >
              <!-- svelte-ignore a11y_media_has_caption -->
              <track kind="captions" />
              Your browser does not support the video element.
            </video>
          {:else}
            <img
              class="thumb-img"
              src={detail.thumb}
              alt={detail.title}
              loading="lazy"
              decoding="async"
            />
          {/if}
        </div>

        <!-- Section nav -->
        <SectionNav {sections} />

        <!-- ── Sections ── -->

        <!-- Key Takeaways -->
        <section class="content-section" id="takeaways" aria-labelledby="takeaways-heading">
          <h2 id="takeaways-heading" class="section-heading">Key Takeaways</h2>
          {#if detail.keyTakeaways.length > 0}
            <ul class="takeaways-list">
              {#each detail.keyTakeaways as item}
                <li>{item}</li>
              {/each}
            </ul>
          {:else}
            <p class="empty-text">No takeaways available.</p>
          {/if}
        </section>

        <!-- Transcript -->
        <section class="content-section" id="transcript" aria-labelledby="transcript-heading">
          <h2 id="transcript-heading" class="section-heading">Transcript</h2>
          {#if detail.transcript}
            <div class="transcript-body">
              <pre class="transcript-pre">{detail.transcript}</pre>
            </div>
          {:else}
            <p class="empty-text">No transcript available.</p>
          {/if}
        </section>

        <!-- On-screen / Visual description -->
        <section class="content-section" id="onscreen" aria-labelledby="onscreen-heading">
          <h2 id="onscreen-heading" class="section-heading">On-screen</h2>
          {#if detail.visualDescription}
            <p class="prose">{detail.visualDescription}</p>
          {:else}
            <p class="empty-text">No visual description available.</p>
          {/if}
        </section>

        <!-- Tools / Actionable items -->
        <section class="content-section" id="tools" aria-labelledby="tools-heading">
          <h2 id="tools-heading" class="section-heading">Tools &amp; Resources</h2>
          {#if detail.actionableItems.length > 0}
            <div class="tools-list">
              {#each detail.actionableItems as item}
                <ActionableItem {item} />
              {/each}
            </div>
          {:else}
            <p class="empty-text">No tools extracted.</p>
          {/if}
        </section>

        <!-- Links -->
        <section class="content-section" id="links" aria-labelledby="links-heading">
          <h2 id="links-heading" class="section-heading">Links</h2>
          {#if detail.links.length > 0}
            <ul class="links-list">
              {#each detail.links as link}
                <li class="link-item">
                  <a
                    href={(link as LinkItem).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-anchor"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="link-icon">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15,3 21,3 21,9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    {(link as LinkItem).name || (link as LinkItem).url}
                  </a>
                  {#if (link as LinkItem).description}
                    <span class="link-desc">{(link as LinkItem).description}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="empty-text">No links extracted.</p>
          {/if}
        </section>
      </div>

      <!-- ── Sidebar ── -->
      <aside class="sidebar" aria-label="Video details and related">
        <!-- Verification card -->
        <div class="sidebar-card">
          <div class="verif-header">
            <VerificationBadge score={detail.verification} confidence={detail.confidence} />
          </div>

          {#if detail.verificationSummary}
            <p class="sidebar-prose">{detail.verificationSummary}</p>
          {/if}

          <dl class="stats-dl">
            <div class="stat-row">
              <dt>Implementability</dt>
              <dd>
                <div class="score-bar-wrap" aria-label="Implementability {detail.implementability}/10">
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      style="width:{Math.min(100, (detail.implementability / 10) * 100)}%"
                    ></div>
                  </div>
                  <span class="score-val">{detail.implementability}<span class="score-denom">/10</span></span>
                </div>
              </dd>
            </div>
            {#if detail.usefulness}
              <div class="stat-row">
                <dt>Usefulness</dt>
                <dd class="stat-text">{detail.usefulness}</dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Related videos -->
        {#if detail.relatedIds.length > 0}
          <div class="sidebar-card">
            <h3 class="sidebar-section-title">Related</h3>
            <RelatedRail ids={detail.relatedIds} />
          </div>
        {/if}
      </aside>
    </div>
  {/if}
</div>

<style>
  .video-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Two-column layout ── */
  .layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 32px;
    align-items: start;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  /* ── Title ── */
  .title {
    margin: 0;
    font-size: var(--fs-4);
    font-weight: 700;
    line-height: 1.25;
    color: var(--text);
  }

  /* ── Meta row ── */
  .meta-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: var(--fs-1);
    color: var(--muted);
  }

  .meta-sep {
    color: var(--faint);
    user-select: none;
  }

  .meta-item {
    color: var(--muted);
  }

  .ig-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-size: var(--fs-1);
    text-decoration: none;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: var(--elevated);
    transition: color var(--t-fast), border-color var(--t-fast);
  }

  .ig-link:hover {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
    text-decoration: none;
  }

  /* ── Tags ── */
  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  /* ── Media ── */
  .media-wrap {
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--elevated);
    border: 1px solid var(--border);
    max-height: 540px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-player {
    width: 100%;
    max-height: 540px;
    display: block;
    background: #000;
  }

  .thumb-img {
    width: 100%;
    max-height: 540px;
    object-fit: contain;
    display: block;
  }

  /* ── Content sections ── */
  .content-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-margin-top: 80px;
  }

  .section-heading {
    margin: 0;
    font-size: var(--fs-2);
    font-weight: 600;
    color: var(--text);
    padding-top: 4px;
  }

  .takeaways-list {
    margin: 0;
    padding: 0 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--text);
    font-size: var(--fs-1);
    line-height: 1.6;
  }

  .takeaways-list li {
    padding-left: 4px;
  }

  .transcript-body {
    overflow-x: auto;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .transcript-pre {
    margin: 0;
    padding: 16px 20px;
    font-size: var(--fs-1);
    font-family: inherit;
    color: var(--text);
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .prose {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
    line-height: 1.65;
  }

  .tools-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .links-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .link-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .link-anchor {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-1);
    color: var(--accent);
    text-decoration: none;
    word-break: break-all;
  }

  .link-anchor:hover {
    text-decoration: underline;
  }

  .link-icon {
    flex-shrink: 0;
    color: var(--muted);
  }

  .link-desc {
    font-size: var(--fs-0);
    color: var(--faint);
    padding-left: 20px;
  }

  .empty-text {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--faint);
  }

  /* ── Sidebar ── */
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: sticky;
    top: 20px;
  }

  .sidebar-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .verif-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sidebar-prose {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
    line-height: 1.55;
  }

  .stats-dl {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
  }

  .stat-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-row dt {
    font-size: var(--fs-0);
    color: var(--faint);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-row dd {
    margin: 0;
  }

  .stat-text {
    font-size: var(--fs-1);
    color: var(--text);
    text-transform: capitalize;
  }

  .score-bar-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .score-bar {
    flex: 1;
    height: 6px;
    background: var(--elevated);
    border-radius: 3px;
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width var(--t);
  }

  .score-val {
    font-size: var(--fs-1);
    font-weight: 600;
    color: var(--text);
    min-width: 32px;
    text-align: right;
  }

  .score-denom {
    font-size: var(--fs-0);
    color: var(--faint);
    font-weight: 400;
  }

  .sidebar-section-title {
    margin: 0;
    font-size: var(--fs-1);
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Responsive: stack at <=900px ── */
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .title {
      font-size: var(--fs-3);
    }

    .media-wrap {
      max-height: 300px;
    }

    .video-player,
    .thumb-img {
      max-height: 300px;
    }
  }
</style>
