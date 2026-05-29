<script lang="ts">
  import Chip from './Chip.svelte';

  interface Props {
    tag: string;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
  }

  const { tag, size = 'sm', onclick }: Props = $props();

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (onclick) onclick(e);
  }
</script>

<Chip
  label={'#' + tag}
  href={'/tag/' + encodeURIComponent(tag)}
  color="var(--muted)"
  bg="var(--elevated)"
  {size}
  onclick={handleClick}
/>
