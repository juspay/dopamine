<script lang="ts">
  import { Loader } from '@juspay/svelte-ui-components';

  interface Props {
    size?: number;
    label?: string;
  }

  const { size = 24, label = 'Loading…' }: Props = $props();

  // Derive proportional pseudo-element sizes from the outer size.
  // Loader defaults: outer=20, :before=10 (50%), :after=15 (75%).
  const beforeSize = $derived(Math.round(size * 0.5));
  const afterSize = $derived(Math.round(size * 0.75));
</script>

<div class="spinner-wrap" role="status" aria-label={label}>
  <span
    class="loader-sizer"
    style="--loader-width:{size}px; --loader-height:{size}px; --loader-before-width:{beforeSize}px; --loader-before-height:{beforeSize}px; --loader-after-width:{afterSize}px; --loader-after-height:{afterSize}px;"
  >
    <Loader />
  </span>
  <span class="sr-only">{label}</span>
</div>

<style>
  .spinner-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
  }

  .loader-sizer {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
