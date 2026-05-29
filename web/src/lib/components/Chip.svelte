<script lang="ts">
  interface Props {
    label: string;
    href?: string;
    color?: string;
    bg?: string;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
  }

  const { label, href, color, bg, size = 'sm', onclick }: Props = $props();

  const style = $derived(
    [color ? `color:${color}` : '', bg ? `background:${bg}` : ''].filter(Boolean).join(';')
  );
</script>

{#if href}
  <a
    {href}
    class="chip"
    class:chip-md={size === 'md'}
    style={style || undefined}
    onclick={onclick}
  >
    {label}
  </a>
{:else}
  <span class="chip" class:chip-md={size === 'md'} style={style || undefined}>
    {label}
  </span>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: 500;
    line-height: 1.6;
    color: var(--muted);
    background: var(--elevated);
    text-decoration: none;
    white-space: nowrap;
    border: 1px solid transparent;
    transition: filter var(--t-fast), border-color var(--t-fast);
    cursor: default;
  }

  a.chip {
    cursor: pointer;
  }

  a.chip:hover {
    text-decoration: none;
    filter: brightness(1.2);
    border-color: currentColor;
  }

  a.chip:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .chip-md {
    padding: 4px 12px;
    font-size: var(--fs-1);
  }
</style>
