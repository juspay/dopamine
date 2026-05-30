<script lang="ts">
  import { Pill, Tooltip } from '@juspay/svelte-ui-components';
  import { verifLabel, verifColor } from '$lib/format.js';

  interface Props {
    score: string;
    confidence?: number;
    size?: 'dot' | 'badge';
  }

  const { score, confidence, size = 'badge' }: Props = $props();

  const label = $derived(verifLabel(score));
  const color = $derived(verifColor(score));
  const tooltipText = $derived(
    confidence != null ? `${label} (${Math.round(confidence * 100)}% confidence)` : label
  );

  /* Status-aware background — picks up the semantic --*-bg tokens */
  const pillBg = $derived(
    score === 'verified_useful'   ? 'var(--ok-bg)'
    : score === 'partially_verified' ? 'var(--warn-bg)'
    : score === 'outdated'           ? 'var(--bad-bg)'
    : /* not_verified / fallback */    'var(--neutral-bg)'
  );

  const pillHoverBg = $derived(
    score === 'verified_useful'   ? 'color-mix(in srgb, var(--ok)      28%, transparent)'
    : score === 'partially_verified' ? 'color-mix(in srgb, var(--warn)    28%, transparent)'
    : score === 'outdated'           ? 'color-mix(in srgb, var(--bad)     28%, transparent)'
    : /* not_verified / fallback */    'color-mix(in srgb, var(--neutral) 28%, transparent)'
  );

  const pillBorderColor = $derived(
    score === 'verified_useful'   ? 'color-mix(in srgb, var(--ok)      35%, transparent)'
    : score === 'partially_verified' ? 'color-mix(in srgb, var(--warn)    35%, transparent)'
    : score === 'outdated'           ? 'color-mix(in srgb, var(--bad)     35%, transparent)'
    : /* not_verified / fallback */    'color-mix(in srgb, var(--neutral) 35%, transparent)'
  );
</script>

{#if size === 'dot'}
  <Tooltip text={tooltipText} position="top">
    {#snippet children()}
      <span
        class="verif-dot"
        style="background:{color}"
        aria-label={tooltipText}
        role="img"
      ></span>
    {/snippet}
  </Tooltip>
{:else}
  <span
    class="verif-pill-wrap"
    style="--pill-color:{color};--pill-background:{pillBg};--pill-hover-background:{pillHoverBg};--pill-hover-color:{color};--pill-border:1px solid {pillBorderColor}"
  >
    <Pill text={label} />
  </span>
{/if}

<style>
  .verif-dot {
    display: inline-block;
    width: var(--space-2);
    height: var(--space-2);
    border-radius: 50%;
    flex-shrink: 0;
    cursor: default;
  }

  .verif-pill-wrap {
    display: inline-flex;
  }
</style>
