import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Build the SPA into the repo's dashboard/ dir, served by the express server.
    adapter: adapter({
      pages: '../dashboard',
      assets: '../dashboard',
      fallback: 'index.html',
      precompress: false,
      strict: false
    }),
    paths: { base: '' }
  }
};

export default config;
