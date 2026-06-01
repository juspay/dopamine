<script lang="ts">
  import Chip from './Chip.svelte';
  import { goto } from '$app/navigation';

  interface Props {
    tag: string;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
  }

  const { tag, size = 'sm', onclick }: Props = $props();

  function handleClick(e: MouseEvent): void {
    e.stopPropagation();
    if (onclick) {
      onclick(e);
    } else {
      goto('/tag/' + encodeURIComponent(tag));
    }
  }
</script>

<!-- Some pipeline tags already include a leading '#'; avoid rendering '##'. -->
<Chip label={tag.startsWith('#') ? tag : '#' + tag} {size} onclick={handleClick} />
