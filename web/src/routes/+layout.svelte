<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<main class="container">
  {@render children()}
</main>
