<script lang="ts">
  import { Loader } from '@juspay/svelte-ui-components';

  interface Props {
    size?: number;
    label?: string;
  }

  const { size = 24, label = 'Loading…' }: Props = $props();
</script>

<div class="spinner-wrap" role="status" aria-label={label}>
  <span style="font-size:{size}px">
    <Loader />
  </span>
  <span class="sr-only">{label}</span>
</div>

<style>
  .spinner-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
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
