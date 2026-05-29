<script lang="ts">
  interface Section {
    id: string;
    label: string;
  }

  interface Props {
    sections: Section[];
  }

  const { sections }: Props = $props();

  let activeId = $state('' as string);
  $effect(() => { if (!activeId && sections.length > 0) activeId = sections[0]!.id; });

  function scrollTo(id: string) {
    activeId = id;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  $effect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observers: IntersectionObserver[] = [];

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (!el) continue;

      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            activeId = section.id;
          }
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );

      io.observe(el);
      observers.push(io);
    }

    return () => observers.forEach((o) => o.disconnect());
  });
</script>

<nav class="section-nav" aria-label="Page sections">
  {#each sections as section}
    <button
      class="section-tab"
      class:active={activeId === section.id}
      onclick={() => scrollTo(section.id)}
      aria-current={activeId === section.id ? 'true' : undefined}
    >
      {section.label}
    </button>
  {/each}
</nav>

<style>
  .section-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }

  .section-tab {
    padding: 8px 14px;
    border-radius: var(--radius) var(--radius) 0 0;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: var(--fs-1);
    color: var(--muted);
    cursor: pointer;
    transition: color var(--t-fast), border-color var(--t-fast);
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .section-tab:hover {
    color: var(--text);
  }

  .section-tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 500;
  }
</style>
