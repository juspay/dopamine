<script lang="ts">
  import { Tabs } from '@juspay/svelte-ui-components';

  interface Section {
    id: string;
    label: string;
  }

  interface Props {
    sections: Section[];
  }

  const { sections }: Props = $props();

  let activeIndex = $state(0);

  $effect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observers: IntersectionObserver[] = [];

    sections.forEach((section, index) => {
      const el = document.getElementById(section.id);
      if (!el) return;

      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            activeIndex = index;
          }
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );

      io.observe(el);
      observers.push(io);
    });

    return () => observers.forEach((o) => o.disconnect());
  });

  function handleTabChange(index: number) {
    activeIndex = index;
    const section = sections[index];
    if (!section) return;
    const el = document.getElementById(section.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

<nav aria-label="Page sections">
  <Tabs
    items={sections.map((s) => s.label)}
    activeIndex={activeIndex}
    onchange={handleTabChange}
  />
</nav>
