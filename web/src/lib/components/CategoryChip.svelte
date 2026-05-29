<script lang="ts">
  import { Pill } from '@juspay/svelte-ui-components';
  import { goto } from '$app/navigation';
  import { catColor, catBg } from '$lib/format.js';

  interface Props {
    cat: string;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
  }

  const { cat, size = 'sm', onclick }: Props = $props();

  const bg = $derived(catBg(cat));
  const color = $derived(catColor(cat));

  const pillVars = $derived(
    `--pill-background:${bg};--pill-hover-background:${bg};--pill-color:${color};--pill-hover-color:${color}`
  );

  function handleClick(e: MouseEvent): void {
    e.stopPropagation();
    if (onclick) {
      onclick(e);
    } else {
      goto('/category/' + encodeURIComponent(cat));
    }
  }
</script>

<span class="chip-wrap" class:chip-md={size === 'md'} style={pillVars}>
  <Pill text={cat} onclick={handleClick} />
</span>

<style>
  .chip-wrap {
    display: inline-flex;
    --pill-padding: 2px 8px;
    --pill-font-size: var(--fs-0);
  }

  .chip-md {
    --pill-padding: 4px 12px;
    --pill-font-size: var(--fs-1);
  }
</style>
