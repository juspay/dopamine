<script lang="ts">
  import { goto } from '$app/navigation';

  interface Props {
    placeholder?: string;
    initialValue?: string;
    onSubmit?: (q: string) => void;
  }

  const {
    placeholder = 'Search videos, tools, creators…',
    initialValue = '',
    onSubmit
  }: Props = $props();

  let query = $state('');
  $effect(() => {
    query = initialValue;
  });

  function submit(e: Event) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (onSubmit) onSubmit(q);
    else goto('/search?q=' + encodeURIComponent(q));
  }
</script>

<form class="search-box" role="search" onsubmit={submit}>
  <span class="search-icon" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  </span>
  <input
    class="search-input"
    type="search"
    name="q"
    {placeholder}
    bind:value={query}
    aria-label="Search"
    autocomplete="off"
    spellcheck="false"
  />
  <button class="search-submit" type="submit" aria-label="Submit search">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  </button>
</form>

<style>
  .search-box {
    display: flex;
    align-items: center;
    width: 100%;
    height: 38px;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 0 6px 0 12px;
    transition: border-color var(--t-fast);
  }

  .search-box:focus-within {
    border-color: var(--accent);
  }

  .search-icon {
    display: flex;
    align-items: center;
    color: var(--faint);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-size: var(--fs-1);
    padding: 0 8px;
  }

  .search-input::placeholder {
    color: var(--faint);
  }

  .search-input::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
  }

  .search-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border: none;
    background: none;
    color: var(--muted);
    border-radius: 50%;
    cursor: pointer;
    transition: color var(--t-fast), background var(--t-fast);
  }

  .search-submit:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
</style>
