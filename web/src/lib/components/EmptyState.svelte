<script lang="ts">
  interface Props {
    message?: string;
    icon?: string;
  }

  const { message = 'Nothing here yet.', icon = '○' }: Props = $props();
</script>

<div class="empty-state" role="status" aria-live="polite">
  <span class="empty-icon" aria-hidden="true">{icon}</span>
  <p class="empty-msg">{message}</p>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 64px 24px;
    color: var(--faint);
    text-align: center;
  }

  .empty-icon {
    font-size: 32px;
    opacity: 0.4;
  }

  .empty-msg {
    margin: 0;
    font-size: var(--fs-1);
    line-height: 1.5;
    max-width: 280px;
  }
</style>
