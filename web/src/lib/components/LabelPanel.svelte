<script lang="ts">
  /**
   * Per-learning verdict control: which projects this actually applies to, plus
   * free tags and a note.
   *
   * The mapper's own guess is shown alongside so the human is correcting
   * something concrete rather than answering from a blank page — but the two are
   * kept visually distinct, because a panel that pre-fills the guess as if it
   * were the answer would harvest agreement instead of judgement.
   */
  import { getLabel, isReviewed, setNote, setTags, setVerdict, toggleProject } from '$lib/labels.svelte.js';

  interface Props {
    id: string;
    /** Portfolio projects, offered as the selectable set. */
    projects: string[];
    /** What the pipeline currently claims, for comparison only. */
    suggested?: string[];
    compact?: boolean;
  }

  const { id, projects, suggested = [], compact = false }: Props = $props();

  const label = $derived(getLabel(id));
  const chosen = $derived(label?.projects ?? []);
  const verdict = $derived(label?.verdict ?? 'applies');
  const reviewed = $derived(isReviewed(id));

  let tagDraft = $state('');
  let noteOpen = $state(false);
  let noteDraft = $state('');

  // Seed the note box from saved state when it is opened, not on every keystroke.
  function openNote(): void {
    noteDraft = label?.note ?? '';
    noteOpen = true;
  }

  function commitTag(): void {
    const t = tagDraft.trim();
    if (!t) return;
    const next = [...(label?.tags ?? []), t];
    tagDraft = '';
    void setTags(id, next);
  }

  function onTagKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTag();
    }
  }

  function removeTag(t: string): void {
    void setTags(id, (label?.tags ?? []).filter((x) => x !== t));
  }

  function commitNote(): void {
    void setNote(id, noteDraft);
    noteOpen = false;
  }

  const agreesWithPipeline = $derived(
    suggested.length > 0 &&
      chosen.length === suggested.length &&
      suggested.every((s) => chosen.some((c) => c.toLowerCase() === s.toLowerCase()))
  );
</script>

<div class="label-panel" class:compact class:reviewed>
  <div class="row">
    <span class="lede">Applies to</span>
    <div class="chips">
      {#each projects as p}
        {@const on = chosen.some((c) => c.toLowerCase() === p.toLowerCase())}
        {@const wasSuggested = suggested.some((s) => s.toLowerCase() === p.toLowerCase())}
        <button
          type="button"
          class="pick"
          class:on
          class:suggested={wasSuggested && !on}
          aria-pressed={on}
          title={wasSuggested ? 'The pipeline mapped this here' : undefined}
          onclick={() => toggleProject(id, p)}
        >
          {p}{#if wasSuggested}<span class="dot" aria-hidden="true">•</span>{/if}
        </button>
      {/each}
      <button
        type="button"
        class="pick none"
        class:on={verdict === 'none'}
        aria-pressed={verdict === 'none'}
        title="Confirmed non-match — a positive datum, not a skip"
        onclick={() => setVerdict(id, verdict === 'none' ? 'applies' : 'none')}
      >
        Nothing
      </button>
    </div>
  </div>

  {#if !compact}
    <div class="row">
      <span class="lede">Tags</span>
      <div class="chips">
        {#each label?.tags ?? [] as t}
          <button type="button" class="tag" onclick={() => removeTag(t)} title="Remove tag">{t} ×</button>
        {/each}
        <input
          class="tag-input"
          type="text"
          placeholder="add tag…"
          bind:value={tagDraft}
          onkeydown={onTagKey}
          onblur={commitTag}
        />
      </div>
    </div>

    <div class="row">
      <span class="lede">Note</span>
      {#if noteOpen}
        <div class="note-edit">
          <!-- svelte-ignore a11y_autofocus -->
          <textarea bind:value={noteDraft} rows="2" placeholder="why?" autofocus></textarea>
          <button type="button" class="mini" onclick={commitNote}>Save</button>
        </div>
      {:else}
        <button type="button" class="mini ghost" onclick={openNote}>
          {label?.note ? label.note.slice(0, 80) : 'add note'}
        </button>
      {/if}
    </div>
  {/if}

  {#if reviewed}
    <p class="state">
      {#if verdict === 'none'}
        Marked as applying nowhere
      {:else if agreesWithPipeline}
        Confirms the pipeline
      {:else if chosen.length}
        Corrected → {chosen.join(', ')}
      {:else}
        Reviewed
      {/if}
    </p>
  {/if}
</div>

<style>
  .label-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--elevated);
  }
  .label-panel.reviewed {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  }
  .label-panel.compact {
    padding: var(--space-2);
    background: none;
    border: none;
  }
  .row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .lede {
    font-size: var(--fs-0);
    color: var(--muted);
    min-width: 4.5rem;
    padding-top: 0.2rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    flex: 1;
  }
  .pick {
    font: inherit;
    font-size: var(--fs-0);
    padding: 0.16rem 0.55rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
    transition: all var(--t-fast);
  }
  .pick:hover {
    color: var(--text);
    border-color: var(--accent);
  }
  .pick.suggested {
    border-style: dashed;
  }
  .pick .dot {
    margin-left: 0.25rem;
    opacity: 0.7;
  }
  .pick.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--surface);
    font-weight: var(--fw-medium);
  }
  .pick.none.on {
    background: var(--bad, #b3261e);
    border-color: var(--bad, #b3261e);
  }
  .pick:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .tag {
    font: inherit;
    font-size: var(--fs-0);
    padding: 0.16rem 0.5rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .tag-input {
    font: inherit;
    font-size: var(--fs-0);
    padding: 0.16rem 0.5rem;
    min-width: 8rem;
    border-radius: var(--radius-pill);
    border: 1px dashed var(--border);
    background: transparent;
    color: var(--text);
  }
  .tag-input:focus {
    outline: none;
    border-color: var(--accent);
    border-style: solid;
  }
  .note-edit {
    display: flex;
    gap: var(--space-2);
    flex: 1;
    align-items: flex-start;
  }
  textarea {
    font: inherit;
    font-size: var(--fs-0);
    flex: 1;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    resize: vertical;
  }
  .mini {
    font: inherit;
    font-size: var(--fs-0);
    padding: 0.16rem 0.6rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .mini.ghost {
    border-style: dashed;
    color: var(--muted);
    text-align: left;
  }
  .state {
    margin: 0;
    font-size: var(--fs-0);
    color: var(--accent);
  }
</style>
