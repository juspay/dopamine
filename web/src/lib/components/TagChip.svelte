<script lang="ts">
  import { Pill } from '@juspay/svelte-ui-components';
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

<span class="chip-wrap" class:chip-md={size === 'md'}>
  <Pill text={'#' + tag} onclick={handleClick} />
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
