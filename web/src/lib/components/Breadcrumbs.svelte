<script lang="ts">
  interface BreadcrumbItem {
    label: string;
    href?: string;
  }

  interface Props {
    items: BreadcrumbItem[];
  }

  const { items }: Props = $props();
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    {#each items as item, i}
      <li>
        {#if item.href && i < items.length - 1}
          <a href={item.href}>{item.label}</a>
        {:else}
          <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
        {/if}
        {#if i < items.length - 1}
          <span class="sep" aria-hidden="true">›</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumbs {
    font-size: var(--fs-0);
    color: var(--faint);
  }

  ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  a {
    color: var(--muted);
    text-decoration: none;
    transition: color var(--t-fast);
  }

  a:hover {
    color: var(--accent);
    text-decoration: none;
  }

  span[aria-current='page'] {
    color: var(--text);
    font-weight: 500;
  }

  .sep {
    color: var(--border);
    margin: 0 2px;
  }
</style>
