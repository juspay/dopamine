<script lang="ts">
  import { catColor, catBg } from '$lib/format.js';
  import Chip from './Chip.svelte';

  interface Props {
    cat: string;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
  }

  const { cat, size = 'sm', onclick }: Props = $props();

  function handleClick(e: MouseEvent) {
    if (onclick) {
      e.stopPropagation();
      onclick(e);
    } else {
      e.stopPropagation();
    }
  }
</script>

<Chip
  label={cat}
  href={'/category/' + encodeURIComponent(cat)}
  color={catColor(cat)}
  bg={catBg(cat)}
  {size}
  onclick={handleClick}
/>
