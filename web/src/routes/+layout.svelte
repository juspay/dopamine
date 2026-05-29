<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { loadIndex } from '$lib/data.js';
  import TopBar from '$lib/components/TopBar.svelte';

  const { children } = $props();

  onMount(() => {
    loadIndex();
  });
</script>

<TopBar />
<main class="container">
  {@render children()}
</main>
