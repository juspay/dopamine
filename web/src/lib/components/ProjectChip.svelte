<script lang="ts">
  import Chip from './Chip.svelte';
  import { goto } from '$app/navigation';

  interface Props {
    project: string;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
  }

  const { project, size = 'sm', onclick }: Props = $props();

  function handleClick(e: MouseEvent): void {
    e.stopPropagation();
    if (onclick) {
      onclick(e);
    } else {
      goto('/project/' + encodeURIComponent(project));
    }
  }
</script>

<!-- Arrow prefix distinguishes "applies to <project>" chips from tags/categories. -->
<Chip label={'→ ' + project} {size} onclick={handleClick} />
