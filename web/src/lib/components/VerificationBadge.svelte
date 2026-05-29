<script lang="ts">
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
    class="verif-badge"
    style="color:{color};border-color:color-mix(in srgb,{color} 35%,transparent);background:color-mix(in srgb,{color} 10%,transparent)"
    {title}
  >
    <span class="dot" style="background:{color}" aria-hidden="true"></span>
    {label}
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

  .verif-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-0);
    font-weight: 500;
    border: 1px solid;
    white-space: nowrap;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
