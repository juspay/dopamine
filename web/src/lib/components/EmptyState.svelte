<script lang="ts">
  import { EmptyState as SuiEmptyState } from '@juspay/svelte-ui-components';

  interface Props {
    message?: string;
    icon?: string;
  }

  const { message = 'Nothing here yet.', icon = '○' }: Props = $props();
</script>

{#snippet iconSnippet()}
  <span class="empty-icon" aria-hidden="true">{icon}</span>
{/snippet}

<SuiEmptyState title={message} description="" icon={iconSnippet} />

<style>
  .empty-icon {
    font-size: var(--fs-4);
    opacity: 0.4;
  }
</style>
