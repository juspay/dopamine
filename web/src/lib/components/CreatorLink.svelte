<script lang="ts">
  interface Props {
    name: string;
    fullName?: string;
    onclick?: (e: MouseEvent) => void;
  }

  const { name, fullName, onclick }: Props = $props();

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (onclick) onclick(e);
  }
</script>

<a
  href={'/creator/' + encodeURIComponent(name)}
  class="creator-link"
  title={fullName || name}
  onclick={handleClick}
>
  <span class="at" aria-hidden="true">@</span>{name}
</a>

<style>
  .creator-link {
    font-size: var(--fs-0);
    color: var(--accent);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
    display: inline-block;
    vertical-align: bottom;
    line-height: 1.5;
  }

  .creator-link:hover {
    text-decoration: underline;
  }

  .at {
    color: var(--muted);
    font-size: 0.9em;
  }
</style>
