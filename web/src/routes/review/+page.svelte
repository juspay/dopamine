<script lang="ts">
  /**
   * Review queue — label many learnings in one pass.
   *
   * Deliberately offers every project as a choice regardless of what the
   * pipeline mapped, and never pre-selects the pipeline's guess. The verdicts
   * collected here are meant to be checked AGAINST the mapper, including its
   * low-confidence mappings which this dashboard never displays. Pre-filling
   * them would turn the exercise into confirming the machine rather than
   * judging the learning, and the resulting labels would be worth nothing as
   * ground truth.
   */
  import { page } from '$app/stores';
  import { getVideos, isIndexLoaded, loadFacets, getFacets } from '$lib/data.svelte.js';
  import { getAllLabels, isReviewed, labelsError, labelsLoaded, loadLabels } from '$lib/labels.svelte.js';
  import LabelPanel from '$lib/components/LabelPanel.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

  $effect(() => {
    loadFacets();
    loadLabels();
  });

  const all = $derived(getVideos());
  const loaded = $derived(isIndexLoaded() && labelsLoaded());
  const err = $derived(labelsError());

  const projects = $derived((getFacets()?.projects ?? []).map((p) => p.name));

  type Scope = 'mapped' | 'actionable' | 'all';
  let scope = $state<Scope>('mapped');
  let hideReviewed = $state(true);
  let projectFilter = $state('');
  let limit = $state(25);

  // ?project=Yama so a project page can hand off straight into its own queue.
  let seededFromUrl = false;
  $effect(() => {
    const q = $page.url.searchParams.get('project') ?? '';
    if (!seededFromUrl && q) {
      projectFilter = q;
      seededFromUrl = true;
    }
  });

  const APPLY_TIERS = new Set(['apply-now', 'evaluate-later']);

  const pool = $derived.by(() => {
    let xs = all;
    if (scope === 'mapped') xs = xs.filter((v) => (v.appliesTo ?? []).length > 0);
    else if (scope === 'actionable') xs = xs.filter((v) => APPLY_TIERS.has(v.actionability));
    if (projectFilter)
      xs = xs.filter((v) => (v.appliesTo ?? []).some((p) => p.toLowerCase() === projectFilter.toLowerCase()));
    // Highest-quality first: if the pass stops early, it stops having covered
    // the learnings that matter most.
    return [...xs].sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0));
  });

  // Recomputed via getAllLabels() so the counter tracks saves.
  const reviewedCount = $derived.by(() => {
    getAllLabels();
    return pool.filter((v) => isReviewed(v.id)).length;
  });

  const visible = $derived.by(() => {
    getAllLabels();
    const xs = hideReviewed ? pool.filter((v) => !isReviewed(v.id)) : pool;
    return xs.slice(0, limit);
  });

  const totalLabelled = $derived(Object.keys(getAllLabels()).length);

  const breadcrumbs = [{ label: 'Home', href: '/' }, { label: '→ Review' }];
</script>

<svelte:head><title>Review — Dopamine</title></svelte:head>

<div class="review">
  <Breadcrumbs items={breadcrumbs} />

  <header class="head">
    <h1>Review</h1>
    <p class="sub">
      Mark where each learning actually applies. Your verdicts are the only ground truth in the system —
      everything else is the pipeline grading its own work.
    </p>
  </header>

  {#if err}
    <p class="err">{err} — the dashboard server must be running for labelling to save.</p>
  {/if}

  <div class="controls">
    <div class="group">
      <span class="lbl">Scope</span>
      <button class="seg" class:on={scope === 'mapped'} onclick={() => (scope = 'mapped')}>Mapped</button>
      <button class="seg" class:on={scope === 'actionable'} onclick={() => (scope = 'actionable')}>Actionable</button>
      <button class="seg" class:on={scope === 'all'} onclick={() => (scope = 'all')}>All</button>
    </div>
    <div class="group">
      <span class="lbl">Project</span>
      <select bind:value={projectFilter}>
        <option value="">any</option>
        {#each projects as p}<option value={p}>{p}</option>{/each}
      </select>
    </div>
    <label class="chk">
      <input type="checkbox" bind:checked={hideReviewed} />
      hide reviewed
    </label>
  </div>

  {#if loaded}
    <p class="progress">
      <strong>{reviewedCount}</strong> of {pool.length} in scope reviewed · {totalLabelled} labelled overall
    </p>
  {/if}

  {#if !loaded}
    <Spinner />
  {:else if visible.length === 0}
    <p class="done">Nothing left in this scope. Widen the scope or untick “hide reviewed”.</p>
  {:else}
    <ul class="rows">
      {#each visible as v (v.id)}
        <li class="row">
          <div class="meta">
            <a class="title" href={'/video/' + encodeURIComponent(v.id)}>{v.title}</a>
            <span class="sub2">
              {v.category}{#if v.actionability}<span class="sep">·</span>{v.actionability}{/if}
              {#if (v.appliesTo ?? []).length}<span class="sep">·</span>pipeline says {v.appliesTo.join(', ')}{/if}
            </span>
          </div>
          <LabelPanel id={v.id} {projects} suggested={v.appliesTo ?? []} />
        </li>
      {/each}
    </ul>
    {#if visible.length >= limit}
      <button class="more" onclick={() => (limit += 25)}>Show more</button>
    {/if}
  {/if}
</div>

<style>
  .review {
    max-width: var(--content-max, 72rem);
    margin: 0 auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .head h1 {
    margin: 0;
    font-size: var(--fs-4);
  }
  .sub {
    margin: var(--space-1) 0 0;
    color: var(--muted);
    font-size: var(--fs-1);
    max-width: 62ch;
  }
  .err {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border-left: 3px solid var(--bad, #b3261e);
    background: var(--elevated);
    font-size: var(--fs-0);
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
  }
  .group {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .lbl {
    font-size: var(--fs-0);
    color: var(--muted);
    margin-right: var(--space-1);
  }
  .seg,
  .more {
    font: inherit;
    font-size: var(--fs-0);
    padding: 0.2rem 0.7rem;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--muted);
    border-radius: var(--radius-pill);
    cursor: pointer;
    transition: all var(--t-fast);
  }
  .seg.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--surface);
  }
  select {
    font: inherit;
    font-size: var(--fs-0);
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
  }
  .chk {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--fs-0);
    color: var(--muted);
  }
  .progress {
    margin: 0;
    font-size: var(--fs-0);
    color: var(--muted);
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .title {
    color: var(--text);
    font-size: var(--fs-1);
    font-weight: var(--fw-medium);
    text-decoration: none;
  }
  .title:hover {
    color: var(--accent);
  }
  .sub2 {
    font-size: var(--fs-0);
    color: var(--muted);
  }
  .sep {
    margin: 0 0.4rem;
    opacity: 0.5;
  }
  .done {
    color: var(--muted);
    font-size: var(--fs-1);
  }
  .more {
    align-self: flex-start;
  }
</style>
