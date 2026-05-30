<script lang="ts">
  import { getVideos, isIndexLoaded, loadDetail } from '$lib/data.svelte.js';
  import type { VideoDetail } from '$lib/types.js';
  import { fmtDate } from '$lib/format.js';
  import CreatorLink from '$lib/components/CreatorLink.svelte';
  import CategoryChip from '$lib/components/CategoryChip.svelte';
  import TagChip from '$lib/components/TagChip.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { Input } from '@juspay/svelte-ui-components';

  // ── Data ──────────────────────────────────────────────────────────────────
  const all = $derived(getVideos());
  const loaded = $derived(isIndexLoaded());

  // ── Search ────────────────────────────────────────────────────────────────
  let query = $state('');

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((v) => {
      return (
        v.title.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.username.toLowerCase().includes(q) ||
        (v.fullName && v.fullName.toLowerCase().includes(q)) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  });

  // ── Expanded entries + lazy detail ───────────────────────────────────────
  // Map from video id -> detail state: undefined = not yet loaded, null = failed, VideoDetail = loaded
  let detailMap = $state<Record<string, VideoDetail | null | 'loading'>>({});

  function toggle(id: string) {
    if (id in detailMap) {
      // Already loaded or loading — remove to collapse
      const next = { ...detailMap };
      delete next[id];
      detailMap = next;
    } else {
      // Mark as loading and fetch
      detailMap = { ...detailMap, [id]: 'loading' };
      loadDetail(id).then((d) => {
        detailMap = { ...detailMap, [id]: d ?? null };
      });
    }
  }

  function isExpanded(id: string): boolean {
    return id in detailMap;
  }

  function getDetail(id: string): VideoDetail | null | 'loading' {
    return detailMap[id] ?? 'loading';
  }
</script>

<div class="kb-page">
  <header class="kb-header">
    <h1 class="kb-title">Knowledge Base</h1>
    <p class="kb-subtitle">
      {#if loaded}
        {all.length} entries — expand any to read key takeaways, topics, and transcript.
      {:else}
        Loading entries…
      {/if}
    </p>
    <div class="kb-search">
      <Input
        value={query}
        placeholder="Filter by title, category, creator, or tag…"
        addFocusColor={true}
        autoComplete="off"
        onInput={(val) => { query = val; }}
        classes="kb-search-input"
      />
    </div>
  </header>

  <div class="kb-body">
    {#if !loaded}
      <Spinner label="Loading knowledge base…" />
    {:else if filtered.length === 0}
      {#if query}
        <EmptyState message={`No entries matching "${query}".`} icon="⊘" />
      {:else}
        <EmptyState message="No entries in the knowledge base yet." />
      {/if}
    {:else}
      <p class="result-count" aria-live="polite">
        {#if query}
          {filtered.length} of {all.length} entries
        {:else}
          {all.length} entries
        {/if}
      </p>

      <ol class="entry-list" aria-label="Knowledge base entries">
        {#each filtered as record (record.id)}
          {@const expanded = isExpanded(record.id)}
          <li class="entry" class:entry--expanded={expanded}>
            <!-- Row: title + meta -->
            <div class="entry-head">
              <div class="entry-top">
                <a href={`/video/${encodeURIComponent(record.id)}`} class="entry-title">
                  {record.title}
                </a>
                <button
                  class="expand-btn"
                  onclick={() => toggle(record.id)}
                  aria-expanded={expanded}
                  aria-label={expanded ? 'Collapse entry' : 'Expand to read more'}
                  type="button"
                >
                  <svg
                    class="chevron"
                    class:chevron--open={expanded}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              <div class="entry-meta">
                <CreatorLink name={record.username} fullName={record.fullName} />
                <CategoryChip cat={record.category} />
                {#if record.date}
                  <span class="meta-date">{fmtDate(record.date)}</span>
                {/if}
              </div>
            </div>

            <!-- Expanded content (lazy-loaded) -->
            {#if expanded}
              {@const detail = getDetail(record.id)}
              <div class="entry-body">
                {#if detail === 'loading'}
                  <div class="inline-spinner">
                    <Spinner size={18} label="Loading detail…" />
                  </div>
                {:else if detail === null}
                  <p class="detail-error">Could not load detail for this entry.</p>
                {:else}
                  <!-- Key Takeaways -->
                  {#if detail.keyTakeaways && detail.keyTakeaways.length > 0}
                    <section class="detail-section">
                      <h3 class="detail-heading">Key Takeaways</h3>
                      <ul class="takeaway-list">
                        {#each detail.keyTakeaways as point}
                          <li class="takeaway-item">{point}</li>
                        {/each}
                      </ul>
                    </section>
                  {/if}

                  <!-- Topics -->
                  {#if detail.topics && detail.topics.length > 0}
                    <section class="detail-section">
                      <h3 class="detail-heading">Topics</h3>
                      <div class="chip-row">
                        {#each detail.topics as topic}
                          <TagChip tag={topic} />
                        {/each}
                      </div>
                    </section>
                  {/if}

                  <!-- Transcript excerpt -->
                  {#if detail.transcript && detail.transcript.trim().length > 0}
                    <section class="detail-section">
                      <h3 class="detail-heading">Transcript excerpt</h3>
                      <blockquote class="transcript-excerpt">
                        {detail.transcript.trim().slice(0, 400)}{detail.transcript.trim().length > 400 ? '…' : ''}
                      </blockquote>
                    </section>
                  {/if}

                  <!-- Read full article link -->
                  <a href={`/video/${encodeURIComponent(record.id)}`} class="read-more">
                    Read full entry
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>

<style>
  /* ── Page layout ─────────────────────────────────────────────────────── */
  .kb-page {
    max-width: 72ch;
    margin: 0 auto;
    padding: var(--space-12) var(--space-5) var(--space-16);
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  .kb-header {
    margin-bottom: var(--space-8);
  }

  .kb-title {
    font-size: var(--fs-4);
    font-weight: var(--fw-bold);
    color: var(--text);
    margin: 0 0 var(--space-1);
    letter-spacing: -0.02em;
    line-height: var(--lh-tight);
  }

  .kb-subtitle {
    font-size: var(--fs-1);
    color: var(--muted);
    margin: 0 0 var(--space-5);
    line-height: var(--lh-normal);
  }

  /* ── Search — SUI Input wrapper ──────────────────────────────────────── */
  .kb-search {
    width: 100%;
  }

  /* Scope SUI Input styles so it fits our pill-style search bar */
  .kb-search :global(.kb-search-input) {
    width: 100%;
  }

  .kb-search :global(.kb-search-input input) {
    width: 100%;
    margin: 0;
    border-radius: var(--radius-pill);
    padding: var(--space-2) var(--space-4);
    background: var(--elevated);
  }

  /* ── Result count ────────────────────────────────────────────────────── */
  .result-count {
    font-size: var(--fs-0);
    color: var(--faint);
    margin: 0 0 var(--space-4);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  /* ── Entry list ──────────────────────────────────────────────────────── */
  .entry-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .entry {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: border-color var(--t-fast);
  }

  .entry:hover,
  .entry--expanded {
    border-color: var(--accent);
  }

  /* ── Entry head ──────────────────────────────────────────────────────── */
  .entry-head {
    padding: var(--space-3) var(--space-4) var(--space-3);
  }

  .entry-top {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .entry-title {
    flex: 1;
    font-size: var(--fs-2);
    font-weight: var(--fw-semibold);
    color: var(--text);
    text-decoration: none;
    line-height: var(--lh-normal);
    transition: color var(--t-fast);
  }

  .entry-title:hover {
    color: var(--accent);
  }

  .entry-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .meta-date {
    font-size: var(--fs-0);
    color: var(--faint);
    white-space: nowrap;
  }

  /* ── Expand button — WCAG 44×44px touch target ───────────────────────── */
  .expand-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    color: var(--muted);
    transition: border-color var(--t-fast), color var(--t-fast), background var(--t-fast);
    padding: 0;
    margin-top: var(--space-1);
  }

  .expand-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-subtle);
  }

  .expand-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .chevron {
    transition: transform var(--t);
  }

  .chevron--open {
    transform: rotate(180deg);
  }

  /* ── Entry body (expanded) ───────────────────────────────────────────── */
  .entry-body {
    border-top: 1px solid var(--border);
    padding: var(--space-4) var(--space-4) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    background: var(--bg);
  }

  .inline-spinner {
    display: flex;
    justify-content: center;
    padding: var(--space-3) 0;
  }

  /* Override Spinner's own padding for inline use */
  .inline-spinner :global(.spinner-wrap) {
    padding: var(--space-1);
  }

  .detail-error {
    font-size: var(--fs-1);
    color: var(--bad);
    margin: 0;
  }

  /* ── Detail sections ─────────────────────────────────────────────────── */
  .detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .detail-heading {
    font-size: var(--fs-0);
    font-weight: var(--fw-semibold);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0;
  }

  .takeaway-list {
    margin: 0;
    padding: 0 0 0 var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .takeaway-item {
    font-size: var(--fs-1);
    color: var(--text);
    line-height: var(--lh-normal);
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .transcript-excerpt {
    margin: 0;
    padding: var(--space-3) var(--space-3);
    border-left: 3px solid var(--border);
    background: var(--elevated);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    font-size: var(--fs-1);
    color: var(--muted);
    line-height: var(--lh-relaxed);
    font-style: italic;
  }

  .read-more {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--fs-1);
    color: var(--accent);
    text-decoration: none;
    font-weight: var(--fw-medium);
    transition: opacity var(--t-fast);
    align-self: flex-start;
  }

  .read-more:hover {
    opacity: 0.8;
    text-decoration: underline;
  }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .kb-page {
      padding: var(--space-6) var(--space-4) var(--space-12);
    }

    .kb-title {
      font-size: var(--fs-3);
    }

    .entry-top {
      align-items: flex-start;
    }

    .entry-title {
      font-size: var(--fs-1);
    }

    .entry-body {
      padding: var(--space-3) var(--space-3) var(--space-3);
    }
  }
</style>
