<script lang="ts">
  import { Pill } from '@juspay/svelte-ui-components';
  import { verifLabel, verifColor } from '$lib/format.js';

  interface Props {
    score: string;
    confidence?: number;
    size?: 'dot' | 'badge';
  }

  const { score, confidence, size = 'badge' }: Props = $props();

  const label = $derived(verifLabel(score));
  const color = $derived(verifColor(score));
  const title = $derived(
    confidence != null ? `${label} (${Math.round(confidence * 100)}% confidence)` : label
  );
</script>

{#if size === 'dot'}
  <span
    class="verif-dot"
    style="background:{color}"
    {title}
    aria-label={title}
    role="img"
  ></span>
{:else}
  <span
    class="verif-pill-wrap"
    {title}
    style="--pill-color:{color};--pill-background:color-mix(in srgb,{color} 18%,transparent);--pill-hover-background:color-mix(in srgb,{color} 28%,transparent);--pill-hover-color:{color};--pill-border:1px solid color-mix(in srgb,{color} 35%,transparent)"
  >
    <Pill text={label} />
  </span>
{/if}

<style>
  .verif-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .verif-pill-wrap {
    display: inline-flex;
  }
</style>
