<script lang="ts">
  interface Props {
    size?: number;
    label?: string;
  }

  const { size = 24, label = 'Loading…' }: Props = $props();
</script>

<div class="spinner-wrap" role="status" aria-label={label}>
  <svg
    class="spinner"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="var(--border)" />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="var(--accent)"
      stroke-linecap="round"
    />
  </svg>
  <span class="sr-only">{label}</span>
</div>

<style>
  .spinner-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
  }

  .spinner {
    animation: spin 0.8s linear infinite;
    color: var(--accent);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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
