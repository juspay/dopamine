<script lang="ts">
  import Chip from './Chip.svelte';
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

  function handleClick(e: MouseEvent): void {
    e.stopPropagation();
    if (onclick) {
      onclick(e);
    } else {
      goto('/category/' + encodeURIComponent(cat));
    }
  }
</script>

<Chip label={cat} {size} color={color} bg={bg} onclick={handleClick} />
