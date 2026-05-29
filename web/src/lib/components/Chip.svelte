<script lang="ts">
  import { Pill } from '@juspay/svelte-ui-components';
  import { goto } from '$app/navigation';

  interface Props {
    label: string;
    href?: string;
    color?: string;
    bg?: string;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
  }

  const { label, href, color, bg, size = 'sm', onclick }: Props = $props();

  const pillVars = $derived(
    [
      bg ? `--pill-background:${bg}` : '',
      bg ? `--pill-hover-background:${bg}` : '',
      color ? `--pill-color:${color}` : '',
      color ? `--pill-hover-color:${color}` : ''
    ]
      .filter(Boolean)
      .join(';')
  );

  const isInteractive = $derived(!!(onclick || href));

  function handleClick(e: MouseEvent): void {
    if (onclick) {
      onclick(e);
    } else if (href) {
      goto(href);
    }
  }
</script>

<span
  class="chip-wrap"
  class:chip-md={size === 'md'}
  class:chip-passive={!isInteractive}
  style={pillVars || undefined}
>
  <Pill text={label} onclick={isInteractive ? handleClick : undefined} />
</span>

<style>
  .chip-wrap {
    display: inline-flex;
    --pill-padding: 2px 8px;
    --pill-font-size: var(--fs-0);
  }

  .chip-wrap.chip-passive {
    --pill-cursor: default;
  }

  .chip-md {
    --pill-padding: 4px 12px;
    --pill-font-size: var(--fs-1);
  }
</style>
