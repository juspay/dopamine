<script lang="ts">
  import type { ActionableItem as ActionableItemType } from '$lib/types.js';
  import { Accordion, Pill, Snippet } from '@juspay/svelte-ui-components';

  interface Props {
    item: ActionableItemType;
  }

  const { item }: Props = $props();

  let expanded = $state(false);

  const hasCode = $derived(!!(item.installCommand || item.code));

  const statusBg = $derived(
    item.urlStatus === 'live' || item.urlStatus === 'ok'
      ? 'var(--ok-bg)'
      : item.urlStatus === 'redirect'
        ? 'var(--warn-bg)'
        : item.urlStatus === 'dead' || item.urlStatus === 'error'
          ? 'var(--bad-bg)'
          : 'var(--neutral-bg)'
  );

  const statusFg = $derived(
    item.urlStatus === 'live' || item.urlStatus === 'ok'
      ? 'var(--ok)'
      : item.urlStatus === 'redirect'
        ? 'var(--warn)'
        : item.urlStatus === 'dead' || item.urlStatus === 'error'
          ? 'var(--bad)'
          : 'var(--neutral)'
  );

  const statusLabel = $derived(
    item.urlStatus === 'live' || item.urlStatus === 'ok'
      ? 'Live'
      : item.urlStatus === 'redirect'
        ? 'Redirect'
        : item.urlStatus === 'dead' || item.urlStatus === 'error'
          ? 'Dead'
          : item.urlStatus || '—'
  );
</script>

<div class="actionable-item">
  <div class="item-header">
    <div class="item-left">
      <Pill text={item.type} />
      <span class="item-name">{item.name}</span>
    </div>
    <div class="item-right">
      <!-- URL status badge using semantic status tokens -->
      <span
        class="url-status"
        style="color:{statusFg};background:{statusBg};border-color:color-mix(in srgb,{statusFg} 30%,transparent)"
      >
        {statusLabel}
      </span>

      <!-- External link -->
      {#if item.url}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          class="ext-link"
          title="Open {item.name}"
          aria-label="Open {item.name} (opens in new tab)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15,3 21,3 21,9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      {/if}

      <!-- Expand/collapse toggle for code snippets -->
      {#if hasCode}
        <button
          class="toggle-btn"
          onclick={() => { expanded = !expanded; }}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="transform: rotate({expanded ? 180 : 0}deg); transition: transform var(--t-fast)"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  {#if item.description}
    <p class="item-desc">{item.description}</p>
  {/if}

  <!-- SUI Accordion for animated expand/collapse with keyboard a11y -->
  {#if hasCode}
    <Accordion expand={expanded}>
      <div class="item-code">
        {#if item.installCommand}
          <div class="code-block">
            <span class="code-label">Install</span>
            <Snippet text={item.installCommand} prompt="$" showCopyButton />
          </div>
        {/if}
        {#if item.code}
          <div class="code-block">
            <span class="code-label">Usage</span>
            <Snippet text={item.code} showCopyButton />
          </div>
        {/if}
      </div>
    </Accordion>
  {/if}
</div>

<style>
  .actionable-item {
    padding: var(--space-3) var(--space-4);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .item-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1;
  }

  .item-name {
    font-size: var(--fs-1);
    font-weight: var(--fw-semibold);
    color: var(--text);
    word-break: break-word;
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .url-status {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: var(--fw-medium);
    border: 1px solid;
    white-space: nowrap;
  }

  .ext-link {
    display: flex;
    align-items: center;
    color: var(--muted);
    text-decoration: none;
    transition: color var(--t-fast);
    min-width: 32px;
    min-height: 32px;
    justify-content: center;
  }

  .ext-link:hover {
    color: var(--accent);
    text-decoration: none;
  }

  .toggle-btn {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    padding: var(--space-1);
    min-width: 32px;
    min-height: 32px;
    border-radius: var(--radius);
    transition: color var(--t-fast), background var(--t-fast);
    cursor: pointer;
  }

  .toggle-btn:hover {
    color: var(--text);
    background: var(--elevated);
  }

  .item-desc {
    margin: 0;
    font-size: var(--fs-1);
    color: var(--muted);
    line-height: var(--lh-normal);
  }

  .item-code {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-2);
  }

  .code-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .code-label {
    font-size: var(--fs-0);
    font-weight: var(--fw-medium);
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
