<script lang="ts">
  import { page } from '$app/stores';
  import SearchBox from './SearchBox.svelte';

  let menuOpen = $state(false);

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/videos', label: 'Videos' },
    { href: '/tools', label: 'Tools' },
    { href: '/kb', label: 'Knowledge' }
  ];

  function isActive(href: string): boolean {
    const p = $page.url.pathname;
    if (href === '/') return p === '/';
    return p.startsWith(href);
  }
</script>

<svelte:window onclick={(e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.topbar')) closeMenu();
}} />

<header class="topbar">
  <div class="topbar-inner">
    <!-- Logo -->
    <a href="/" class="logo" aria-label="Dopamine home">
      <span class="logo-dot" aria-hidden="true">◉</span>
      Dopamine
    </a>

    <!-- Search (hidden on very small screens — toggled below) -->
    <div class="search-wrap">
      <SearchBox />
    </div>

    <!-- Desktop nav -->
    <nav class="nav-desktop" aria-label="Main navigation">
      {#each navLinks as link}
        <a
          href={link.href}
          class="nav-link"
          class:active={isActive(link.href)}
          aria-current={isActive(link.href) ? 'page' : undefined}
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <!-- Mobile controls -->
    <div class="mobile-controls">
      <a href="/search" class="icon-btn" aria-label="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </a>
      <button
        class="icon-btn hamburger"
        onclick={toggleMenu}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
      >
        {#if menuOpen}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile dropdown menu -->
  {#if menuOpen}
    <nav id="mobile-menu" class="nav-mobile" aria-label="Mobile navigation">
      {#each navLinks as link}
        <a
          href={link.href}
          class="mobile-link"
          class:active={isActive(link.href)}
          aria-current={isActive(link.href) ? 'page' : undefined}
          onclick={closeMenu}
        >
          {link.label}
        </a>
      {/each}
    </nav>
  {/if}
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .topbar-inner {
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 0 20px;
    height: 54px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: var(--fs-2);
    font-weight: 700;
    color: var(--text);
    text-decoration: none;
    letter-spacing: -0.02em;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .logo:hover {
    text-decoration: none;
    color: var(--accent);
  }

  .logo-dot {
    color: var(--accent);
    font-size: 14px;
  }

  .search-wrap {
    flex: 1;
    min-width: 0;
    max-width: 440px;
  }

  .nav-desktop {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .nav-link {
    padding: 6px 12px;
    border-radius: var(--radius);
    font-size: var(--fs-1);
    color: var(--muted);
    text-decoration: none;
    transition: color var(--t-fast), background var(--t-fast);
  }

  .nav-link:hover {
    color: var(--text);
    background: var(--elevated);
    text-decoration: none;
  }

  .nav-link.active {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  /* Mobile controls — hidden on desktop */
  .mobile-controls {
    display: none;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius);
    background: none;
    border: none;
    color: var(--muted);
    text-decoration: none;
    transition: color var(--t-fast), background var(--t-fast);
    min-width: 44px;
    min-height: 44px;
  }

  .icon-btn:hover {
    color: var(--text);
    background: var(--elevated);
    text-decoration: none;
  }

  .nav-mobile {
    display: flex;
    flex-direction: column;
    padding: 8px 20px 16px;
    border-top: 1px solid var(--border);
    gap: 2px;
  }

  .mobile-link {
    padding: 11px 12px;
    border-radius: var(--radius);
    font-size: var(--fs-2);
    color: var(--muted);
    text-decoration: none;
    transition: color var(--t-fast), background var(--t-fast);
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .mobile-link:hover {
    color: var(--text);
    background: var(--elevated);
    text-decoration: none;
  }

  .mobile-link.active {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  @media (max-width: 640px) {
    .nav-desktop {
      display: none;
    }
    .mobile-controls {
      display: flex;
    }
    .search-wrap {
      display: none;
    }
    .topbar-inner {
      padding: 0 14px;
    }
  }
</style>
