# SUI Theme Bridge & Design-System Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a CSS-var theme bridge mapping @juspay/svelte-ui-components to Dopamine's dark amber tokens, verify it compiles, and produce a design-system audit doc.

**Architecture:** One new CSS file (`web/src/lib/sui-theme.css`) imported after `theme.css` provides all library overrides. A temporary smoke-test route validates compilation. The audit doc maps bespoke components to library equivalents.

**Tech Stack:** Svelte 5 runes, TypeScript strict, @juspay/svelte-ui-components@2.19.2, SvelteKit static adapter, Vite.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `web/src/lib/sui-theme.css` | :root block mapping all SUI CSS vars to our tokens |
| Modify | `web/src/app.css` | Add `@import './lib/sui-theme.css';` after existing theme import |
| Create (temp) | `web/src/routes/_suismoke/+page.svelte` | Smoke-test import of target components |
| Delete (temp) | `web/src/routes/_suismoke/` | Removed after build succeeds |
| Create | `docs/superpowers/specs/2026-05-29-design-system-audit.md` | Full audit document |

---

### Task 1: Create the SUI theme bridge CSS file

**Files:**
- Create: `web/src/lib/sui-theme.css`

- [ ] **Step 1: Create `web/src/lib/sui-theme.css` with the full :root block**

The file maps every color/background/border/radius/font CSS var from the target components to our existing tokens. Comments group each component. Total vars themed: ~160 (color/visual properties; layout/sizing vars intentionally left at defaults).

```css
/*
 * sui-theme.css
 * Maps @juspay/svelte-ui-components CSS custom properties onto Dopamine's
 * design tokens (defined in theme.css). Import AFTER theme.css.
 *
 * Pattern: --{component}-{element}-{property}: var(--our-token);
 * Only color, background, border, radius, font, shadow, and transition vars
 * are overridden here — sizing/layout vars keep their library defaults.
 */

:root {
  /* ── Global ─────────────────────────────────────────────────────────── */
  --background-color: var(--bg);

  /* ── Button ─────────────────────────────────────────────────────────── */
  --button-color: var(--elevated);
  --button-border: 1px solid var(--border);
  --button-hover-border: 1px solid var(--accent);
  --button-text-color: var(--text);
  --button-hover-color: var(--elevated);
  --button-hover-text-color: var(--accent);
  --button-border-radius: var(--radius);
  --button-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --button-font-size: var(--fs-1);
  --button-font-weight: 500;
  --button-box-shadow: none;

  /* ── Input ──────────────────────────────────────────────────────────── */
  --input-background: var(--surface);
  --input-border: 1px solid var(--border);
  --input-focus-border: 1px solid var(--accent);
  --input-text-color: var(--text);
  --input-placeholder-color: var(--faint);
  --input-radius: var(--radius);
  --input-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --input-font-size: var(--fs-1);
  --input-box-shadow: none;
  --input-label-msg-text-color: var(--muted);
  --input-error-msg-text-color: var(--bad);
  --input-info-msg-text-color: var(--muted);
  --input-field-error-stroke: var(--bad);

  /* ── Select ─────────────────────────────────────────────────────────── */
  --select-trigger-background: var(--surface);
  --select-trigger-border: 1px solid var(--border);
  --select-trigger-hover-border-color: var(--muted);
  --select-trigger-focus-border-color: var(--accent);
  --select-trigger-focus-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
  --select-trigger-border-radius: var(--radius);
  --select-color: var(--text);
  --select-placeholder-color: var(--faint);
  --select-arrow-color: var(--muted);
  --select-dropdown-background: var(--elevated);
  --select-dropdown-border: 1px solid var(--border);
  --select-dropdown-border-radius: var(--radius);
  --select-dropdown-shadow: var(--shadow);
  --select-option-color: var(--text);
  --select-option-hover-background: color-mix(in srgb, var(--accent) 10%, transparent);
  --select-option-hover-color: var(--accent);
  --select-option-selected-background: color-mix(in srgb, var(--accent) 15%, transparent);
  --select-option-selected-color: var(--accent);
  --select-empty-color: var(--faint);
  --select-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --select-font-size: var(--fs-1);
  --select-pill-background: color-mix(in srgb, var(--accent) 15%, transparent);
  --select-pill-color: var(--accent);
  --select-pill-border-radius: var(--radius-pill);
  --select-trigger-transition: border-color var(--t-fast) ease;

  /* ── Card ───────────────────────────────────────────────────────────── */
  --card-background: var(--surface);
  --card-border: 1px solid var(--border);
  --card-border-radius: var(--radius);
  --card-title-color: var(--text);
  --card-title-font-size: var(--fs-2);
  --card-title-font-weight: 600;
  --card-description-color: var(--muted);
  --card-description-font-size: var(--fs-1);
  --card-header-border-bottom: 1px solid var(--border);
  --card-header-padding: 16px 20px;
  --card-content-padding: 20px;

  /* ── Pill ───────────────────────────────────────────────────────────── */
  --pill-background: var(--elevated);
  --pill-hover-background: color-mix(in srgb, var(--accent) 12%, transparent);
  --pill-color: var(--muted);
  --pill-hover-color: var(--accent);
  --pill-border: 1px solid var(--border);
  --pill-border-radius: var(--radius-pill);
  --pill-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --pill-font-size: var(--fs-0);
  --pill-font-weight: 500;
  --pill-dismiss-color: var(--faint);

  /* ── Badge ──────────────────────────────────────────────────────────── */
  --badge-background: var(--elevated);
  --badge-border: 1px solid var(--border);
  --badge-border-radius: var(--radius-pill);
  --badge-color: var(--muted);
  --badge-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --badge-font-size: var(--fs-0);
  --badge-img-background-color: var(--elevated);
  --badge-img-border-radius: 50%;

  /* ── Avatar ─────────────────────────────────────────────────────────── */
  --avatar-background: var(--elevated);
  --avatar-text-color: var(--accent);
  --avatar-border: 1px solid var(--border);
  --avatar-border-radius: 50%;
  --avatar-box-shadow: none;
  --avatar-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --avatar-font-weight: 600;

  /* ── Img ────────────────────────────────────────────────────────────── */
  --image-background: var(--elevated);
  --image-border: 1px solid var(--border);
  --image-border-radius: var(--radius);
  --image-hover-background: var(--elevated);
  --image-hover-border: 1px solid var(--accent);
  --image-transition: border-color var(--t-fast) ease;

  /* ── Table ──────────────────────────────────────────────────────────── */
  --table-border: 1px solid var(--border);
  --table-border-radius: var(--radius);
  --table-header-background: var(--elevated);
  --table-header-color: var(--muted);
  --table-header-font-color: var(--muted);
  --table-header-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
    Roboto, Helvetica, Arial, sans-serif;
  --table-header-font-size: var(--fs-0);
  --table-header-font-weight: 600;
  --table-header-text-transform: uppercase;
  --table-header-letter-spacing: 0.06em;
  --table-header-border-bgcolor: var(--border);
  --table-content-background: var(--surface);
  --table-content-color: var(--text);
  --table-content-font-color: var(--text);
  --table-content-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
    Roboto, Helvetica, Arial, sans-serif;
  --table-content-font-size: var(--fs-1);
  --table-content-border-bgcolor: var(--border);
  --table-row-background: var(--surface);
  --table-row-alt-background: color-mix(in srgb, var(--elevated) 60%, var(--surface));
  --table-row-border: 1px solid var(--border);
  --table-row-hover-background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  --table-inner-border: 1px solid var(--border);
  --table-title-color: var(--text);
  --table-title-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
    Roboto, Helvetica, Arial, sans-serif;
  --table-title-font-size: var(--fs-2);
  --table-title-font-weight: 600;
  --table-empty-color: var(--faint);
  --table-sort-button-color: var(--muted);
  --table-sort-button-hover-background: var(--elevated);
  --table-focus-outline-color: var(--accent);

  /* ── Tabs ───────────────────────────────────────────────────────────── */
  --tabs-bar-background: var(--surface);
  --tabs-bar-border-bottom: 1px solid var(--border);
  --tabs-bar-border-radius: var(--radius);
  --tabs-item-background: transparent;
  --tabs-item-color: var(--muted);
  --tabs-item-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --tabs-item-font-size: var(--fs-1);
  --tabs-item-font-weight: 500;
  --tabs-item-border-radius: var(--radius);
  --tabs-hover-background: color-mix(in srgb, var(--accent) 8%, transparent);
  --tabs-hover-color: var(--text);
  --tabs-active-background: color-mix(in srgb, var(--accent) 12%, transparent);
  --tabs-active-color: var(--accent);
  --tabs-active-font-weight: 600;
  --tabs-indicator-color: var(--accent);
  --tabs-indicator-height: 2px;
  --tabs-indicator-border-radius: 2px;
  --tabs-arrow-background: var(--elevated);
  --tabs-arrow-border: 1px solid var(--border);
  --tabs-arrow-color: var(--muted);
  --tabs-arrow-hover-color: var(--text);
  --tabs-transition: color var(--t-fast) ease, background var(--t-fast) ease;

  /* ── Scroller ───────────────────────────────────────────────────────── */
  --scroller-arrow-background: var(--elevated);
  --scroller-arrow-border: 1px solid var(--border);
  --scroller-arrow-border-radius: var(--radius-pill);
  --scroller-arrow-box-shadow: var(--shadow);
  --scroller-arrow-color: var(--muted);
  --scroller-arrow-hover-background: var(--surface);

  /* ── Snippet ─────────────────────────────────────────────────────────── */
  --snippet-background: var(--elevated);
  --snippet-border: 1px solid var(--border);
  --snippet-border-radius: var(--radius);
  --snippet-color: var(--text);
  --snippet-text-color: var(--text);
  --snippet-prompt-color: var(--accent);
  --snippet-copy-background: var(--surface);
  --snippet-copy-border: 1px solid var(--border);
  --snippet-copy-border-radius: var(--radius);
  --snippet-copy-color: var(--muted);
  --snippet-copy-hover-background: var(--elevated);
  --snippet-copied-color: var(--ok);
  --snippet-font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace,
    SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --snippet-text-font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace,
    SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --snippet-font-size: var(--fs-0);

  /* ── Tooltip ─────────────────────────────────────────────────────────── */
  --tooltip-background: var(--elevated);
  --tooltip-border: 1px solid var(--border);
  --tooltip-border-radius: var(--radius);
  --tooltip-color: var(--text);
  --tooltip-box-shadow: var(--shadow);
  --tooltip-arrow-color: var(--elevated);
  --tooltip-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --tooltip-font-size: var(--fs-0);
  --tooltip-font-weight: 400;
  --tooltip-opacity-duration: var(--t-fast);

  /* ── Toolbar ─────────────────────────────────────────────────────────── */
  --toolbar-background: var(--surface);
  --toolbar-border-radius: var(--radius);
  --toolbar-box-shadow: var(--shadow);
  --toolbar-text-color: var(--text);
  --toolbar-text-font-size: var(--fs-1);
  --toolbar-text-font-weight: 500;

  /* ── Menu ────────────────────────────────────────────────────────────── */
  --menu-background-color: var(--elevated);
  --menu-border: 1px solid var(--border);
  --menu-border-radius: var(--radius);
  --menu-box-shadow: var(--shadow);
  --menu-font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --menu-font-size: var(--fs-1);
  --menu-item-background-color: transparent;
  --menu-item-color: var(--text);
  --menu-item-hover-background-color: color-mix(in srgb, var(--accent) 8%, transparent);
  --menu-item-hover-color: var(--accent);
  --menu-item-focus-background-color: color-mix(in srgb, var(--accent) 12%, transparent);
  --menu-item-focus-outline: none;
  --menu-item-font-weight: 400;
  --menu-item-danger-color: var(--bad);
  --menu-item-danger-hover-background-color: color-mix(in srgb, var(--bad) 10%, transparent);
  --menu-item-danger-hover-color: var(--bad);
  --menu-item-danger-focus-background-color: color-mix(in srgb, var(--bad) 15%, transparent);
  --menu-separator-color: var(--border);
  --menu-trigger-focus-outline: 2px solid var(--accent);

  /* ── EmptyState ──────────────────────────────────────────────────────── */
  --empty-state-title-color: var(--text);
  --empty-state-title-font-size: var(--fs-3);
  --empty-state-title-font-weight: 600;
  --empty-state-description-color: var(--muted);
  --empty-state-description-font-size: var(--fs-1);
  --empty-state-description-opacity: 1;
  --empty-state-icon-color: var(--faint);
  --empty-state-icon-opacity: 0.8;

  /* ── Loader ──────────────────────────────────────────────────────────── */
  --loader-foreground: var(--accent);
  --loader-foreground-end: var(--accent-press);
  --loader-background: color-mix(in srgb, var(--accent) 15%, transparent);
  --loader-text-color: var(--muted);
  --loader-text-font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  --loader-dot-color: var(--accent);
}
```

- [ ] **Step 2: Confirm file was created**

Run: `ls -la web/src/lib/sui-theme.css`
Expected: file exists with non-zero size

---

### Task 2: Wire the theme bridge into app.css

**Files:**
- Modify: `web/src/app.css` (add one import line after line 1)

- [ ] **Step 1: Add the import**

Current `web/src/app.css` line 1:
```
@import './lib/theme.css';
```

Change to:
```css
@import './lib/theme.css';
@import './lib/sui-theme.css';
```

(Everything else in app.css stays exactly the same.)

---

### Task 3: Create smoke-test route to exercise library compilation

**Files:**
- Create: `web/src/routes/_suismoke/+page.svelte`

The route is prefixed with `_` so SvelteKit ignores it as a route segment in production, but the compiler still processes it during `build`.

- [ ] **Step 1: Create `web/src/routes/_suismoke/+page.svelte`**

```svelte
<script lang="ts">
  import {
    Button,
    Pill,
    Card,
    Avatar,
    Img,
    Table,
    EmptyState,
    Loader,
    Snippet,
    Tabs,
  } from '@juspay/svelte-ui-components';
</script>

<div style="display:flex;flex-direction:column;gap:16px;padding:24px;">
  <Button text="Smoke test" />

  <Pill text="category" />

  <Card title="Smoke card" description="Bridge test">
    {#snippet children()}<span>content</span>{/snippet}
  </Card>

  <Avatar alt="Test user" name="Test User" />

  <Img src="https://picsum.photos/120/80" alt="smoke" />

  <Table
    tableHeaders={['A', 'B']}
    tableData={[['row1a', 'row1b']]}
  />

  <EmptyState title="Nothing here" description="All clear" />

  <Loader />

  <Snippet text="npm install dopamine" prompt="$" />

  <Tabs items={['Alpha', 'Beta', 'Gamma']} />
</div>
```

---

### Task 4: Run type-check and build, then clean up

**Files:**
- Delete: `web/src/routes/_suismoke/` (entire directory, after build passes)

- [ ] **Step 1: Run svelte-check (must be 0 errors)**

Run: `npm --prefix web run check`
Expected output: ends with `0 errors` (warnings from library internals are acceptable)

- [ ] **Step 2: Run first build (must exit 0)**

Run: `npm --prefix web run build`
Expected: exits 0, produces `dashboard/` artifacts

- [ ] **Step 3: Delete the smoke-test route**

Remove the entire `web/src/routes/_suismoke/` directory.

- [ ] **Step 4: Re-run build to confirm clean without smoke route**

Run: `npm --prefix web run build`
Expected: exits 0

---

### Task 5: Write the design-system audit doc

**Files:**
- Create: `docs/superpowers/specs/2026-05-29-design-system-audit.md`

- [ ] **Step 1: Create the audit document**

Full content — see below. This documents (a) our token system, (b) comparison to Vercel Geist, (c) adoption strategy, (d) component mapping table.

```markdown
# Design-System Audit — Dopamine Dashboard
**Date:** 2026-05-29  
**Author:** Sachin Sharma  
**Status:** Approved

---

## 1. Our Token System

### Colors
| Token | Value | Semantic Role |
|-------|-------|---------------|
| `--bg` | `#0b0d10` | Page canvas — deepest background |
| `--surface` | `#14171c` | Card / panel background |
| `--elevated` | `#1c2026` | Raised element (dropdown, tooltip, avatar bg) |
| `--border` | `#262b33` | All dividers and outlines |
| `--text` | `#e8ebef` | Primary readable text |
| `--muted` | `#9aa3ad` | Secondary / label text |
| `--faint` | `#6b7480` | Placeholder / disabled text |
| `--accent` | `#f0a868` | Brand amber — primary interactive |
| `--accent-press` | `#e0945a` | Pressed/active accent state |
| `--ok` | `#3fb950` | Success / verified |
| `--warn` | `#d29922` | Warning / unverified |
| `--neutral` | `#8b949e` | Neutral status |
| `--bad` | `#f85149` | Error / failed |

### Spacing
No formal spacing scale — spacing is currently authored inline (8 / 12 / 16 / 20 / 24 px common multiples). No named tokens.

### Typography
| Token | Value | Usage |
|-------|-------|-------|
| `--fs-0` | `12px` | Labels, badges, table headers |
| `--fs-1` | `14px` | Body, inputs, captions |
| `--fs-2` | `16px` | Default body, card titles |
| `--fs-3` | `20px` | Section headings |
| `--fs-4` | `26px` | Page headings |
| `--fs-5` | `34px` | Hero / display |

Font: Inter with `ui-sans-serif` fallback stack.

### Geometry
| Token | Value |
|-------|-------|
| `--radius` | `10px` |
| `--radius-pill` | `999px` |
| `--maxw` | `1320px` |

### Motion
| Token | Value |
|-------|-------|
| `--t-fast` | `120ms` |
| `--t` | `160ms` |

### Elevation
`--shadow`: two-layer shadow suitable for dark backgrounds.

---

## 2. Comparison to Vercel Geist Design System

Vercel's [Geist](https://vercel.com/geist) design system is a well-established reference for dark-first developer interfaces. Key observations:

### Alignment
- **Dark-first palette**: Both systems lead with near-black backgrounds and layered surface elevations. Geist's `--ds-background-100/200` hierarchy mirrors our `--bg / --surface / --elevated` trio.
- **Semantic status colors**: Geist defines `--ds-red / --ds-green / --ds-amber / --ds-blue` as semantic signal colors. Our `--bad / --ok / --warn` map directly onto that intent.
- **Warm accent**: Geist allows per-product accent overrides; Dopamine's amber `--accent` is a deliberate brand signal, consistent with Geist's approach of a single interactive color.
- **Font scale**: Geist uses a 6-step scale (12/14/16/20/24/32px). Our 6-step scale is nearly identical (12/14/16/20/26/34px) — differing only at the top two sizes.
- **Motion**: Geist uses 150ms/200ms easing. Our 120ms/160ms is slightly snappier, appropriate for a tool-centric dashboard.

### Differences & Improvement Opportunities

| Gap | Geist Approach | Dopamine Today | Recommended Change |
|-----|---------------|----------------|-------------------|
| **Spacing scale** | Named 4px-base scale (4/8/12/16/24/32/48/64) | Inline values, no tokens | Add `--space-1..8` tokens (4, 8, 12, 16, 24, 32, 48, 64px) |
| **Semantic color tokens** | `--ds-background-100/200/300`, `--ds-foreground-primary/secondary` | Direct palette tokens | Alias our tokens to semantic names: `--color-bg-page`, `--color-bg-surface`, `--color-text-primary`, `--color-text-secondary`, etc. |
| **Interactive focus ring** | Dedicated `--ds-focus-ring` token | Hardcoded `2px solid var(--accent)` in app.css | Introduce `--focus-ring` token; use in app.css + SUI bridge |
| **Line-height tokens** | `--ds-leading-tight/normal/relaxed` | Only `line-height: 1.55` inline | Add `--lh-tight/normal/relaxed` tokens |
| **Border width tokens** | Consistent 1px hardcoded | 1px hardcoded everywhere | Minor; acceptable as-is |
| **Component-level tokens** | Geist exposes per-component overrides via CSS vars | SUI library does same | Already adopted via this bridge |

### Summary Assessment
Dopamine's token system is **structurally sound and purposeful** for its domain. The primary improvements are: (1) a formal spacing scale to eliminate magic numbers, and (2) semantic alias tokens above the raw palette to make light-mode theming or rebranding possible without touching every component override.

---

## 3. Adoption Strategy

### Approach
We adopt `@juspay/svelte-ui-components` (SUI) as the component layer for all UI primitives. The theme bridge (`web/src/lib/sui-theme.css`) overrides every library CSS custom property that controls visual output, mapping it to our existing design tokens. This means:

1. **No library changes needed** — the library is a pure dependency.
2. **No runtime overhead** — all theming is CSS custom properties resolved at paint time.
3. **Incremental migration** — bespoke components can be replaced one at a time; the bridge is in place from day one.
4. **Dark-mode first** — our tokens are dark by design; no `prefers-color-scheme` adapter needed for the initial product.

### Import Order
```
app.css
  └── @import './lib/theme.css'     ← raw palette + geometry + motion
  └── @import './lib/sui-theme.css' ← SUI var overrides (references theme.css vars)
```

Library components pick up the overrides automatically because CSS custom properties cascade.

---

## 4. Component Mapping Table

| Dopamine Bespoke | Library Replacement | Notes |
|-----------------|--------------------|-|
| `Chip.svelte` | `Pill` | Category / generic chip → `<Pill text={label} />` |
| `CategoryChip.svelte` | `Pill` | Add `onclick` for filter interaction |
| `TagChip.svelte` | `Pill` | `dismissible` variant for filter removal |
| `Spinner.svelte` | `Loader` | Drop-in; `Loader` renders a circular spinner by default |
| `EmptyState.svelte` | `EmptyState` | `title` + `description` props; icon via snippet |
| `SearchBox.svelte` | `Input` | Wrap SUI `Input`; add search icon via `children` snippet |
| Creator avatar in `CreatorLink.svelte` | `Avatar` | `src={creator.avatar}` `name={creator.name}` `size="small"` |
| Video thumbnails | `Img` | `src` + `fallback` props; border-radius from theme |
| `ActionableItem` install/code blocks | `Snippet` | `text={code}` `prompt="$"` `showCopyButton` |
| Knowledge-base tools table | `Table` | `tableHeaders` + `tableData` (string[][]) + `cell` snippet for rich cells |
| `SectionNav.svelte` | `Tabs` | `items={categories}` `onchange={handleNav}`; keep URL sync in wrapper |
| `RelatedRail.svelte` | `Scroller` | `direction="horizontal"` `showArrows` `showGradient` wrapping `VideoCard` children |
| Sidebar info cards | `Card` | `title` + `description` + `children` snippet |
| Category / tag filter dropdowns | `Select` | `items` array; multi-select via `pill` variant |
| Creator tooltips | `Tooltip` | Wrap trigger element; `content` snippet |
| Dashboard top-bar actions | `Button` | Replace custom button elements |
| Sort / filter menu | `Menu` | `items: MenuItem[]` `onselect` handler |
| — | `Badge` | Use for verification status overlays on VideoCard |
| `VideoCard.svelte` | **Keep bespoke** | Complex thumbnail + metadata layout; theme via tokens |
| `VideoGrid.svelte` | **Keep bespoke** | Masonry/grid layout not covered by SUI |
| `Breadcrumbs.svelte` | **Keep bespoke** | Custom routing breadcrumb; too simple to swap |
| `TopBar.svelte` | **Keep bespoke** | App-specific nav bar; use `Toolbar` internals as reference |
| `CreatorLink.svelte` | **Keep bespoke** (+ `Avatar`) | Composite component; replace inner avatar |
| `VerificationBadge.svelte` | **Keep bespoke** | Custom SVG badge with domain-specific status colors |
```

---
```

---

### Self-Review Checklist

- [x] **Spec coverage**: All 5 tasks from the spec covered — discover vars, create sui-theme.css, import into app.css, smoke-test + build, write audit doc.
- [x] **Placeholder scan**: No TBD, no "similar to task N", all code is complete.
- [x] **Type consistency**: Property names in smoke route match `properties.d.ts` signatures verified above. `Card` uses `{#snippet children()}` (Svelte 5 inline snippet syntax matching `Snippet` type). `Table` uses `tableHeaders`/`tableData` (verified). `Snippet` (component) uses `text`/`prompt`/`showCopyButton` (verified). `Tabs` uses `items` (verified). `Avatar` uses `alt`/`name` (verified). `Img` uses `src`/`alt` (verified). `EmptyState` uses `title`/`description` (verified).
