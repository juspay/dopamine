<script lang="ts">
  import { goto } from '$app/navigation';

  interface Props {
    placeholder?: string;
    initialValue?: string;
    onSubmit?: (q: string) => void;
  }

  const { placeholder = 'Search videos, tools, creators…', initialValue = '', onSubmit }: Props =
    $props();

  // initialValue seeds the input; subsequent changes are self-contained
  let query = $state('' as string);
  $effect(() => { query = initialValue; });

  function submit(e: Event) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (onSubmit) {
      onSubmit(q);
    } else {
      goto('/search?q=' + encodeURIComponent(q));
    }
  }
</script>

<form class="search-box" onsubmit={submit} role="search">
  <span class="icon" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  </span>
  <input
    type="search"
    bind:value={query}
    {placeholder}
    aria-label="Search"
    autocomplete="off"
    spellcheck="false"
  />
  <button type="submit" aria-label="Submit search">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  </button>
</form>

<style>
  .search-box {
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    overflow: hidden;
    transition: border-color var(--t-fast);
    min-width: 0;
  }

  .search-box:focus-within {
    border-color: var(--accent);
  }

  .icon {
    display: flex;
    align-items: center;
    padding: 0 10px 0 14px;
    color: var(--faint);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-size: var(--fs-1);
    padding: 8px 4px;
    min-width: 0;
  }

  input::placeholder {
    color: var(--faint);
  }

  /* Remove browser default search cancel */
  input::-webkit-search-cancel-button {
    display: none;
  }

  button {
    background: none;
    border: none;
    padding: 8px 14px;
    color: var(--muted);
    display: flex;
    align-items: center;
    transition: color var(--t-fast);
    flex-shrink: 0;
  }

  button:hover {
    color: var(--accent);
  }
</style>
