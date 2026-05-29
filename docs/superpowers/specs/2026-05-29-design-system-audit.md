# Design-System Audit — Dopamine Dashboard
**Date:** 2026-05-29  
**Author:** Sachin Sharma  
**Status:** Approved

---

## 1. Our Token System

### Color Tokens
| Token | Value | Semantic Role |
|-------|-------|---------------|
| `--bg` | `#0b0d10` | Page canvas — deepest background |
| `--surface` | `#14171c` | Card / panel background |
| `--elevated` | `#1c2026` | Raised elements (dropdowns, tooltips, avatar fallback) |
| `--border` | `#262b33` | All dividers and outlines |
| `--text` | `#e8ebef` | Primary readable text |
| `--muted` | `#9aa3ad` | Secondary / label / caption text |
| `--faint` | `#6b7480` | Placeholder / disabled / de-emphasized text |
| `--accent` | `#f0a868` | Brand amber — primary interactive color |
| `--accent-press` | `#e0945a` | Pressed / active accent state |
| `--ok` | `#3fb950` | Success / verified status |
| `--warn` | `#d29922` | Warning / unverified / caution |
| `--neutral` | `#8b949e` | Neutral / inconclusive status |
| `--bad` | `#f85149` | Error / failed / destructive |

### Spacing
No formal spacing scale — spacing is currently authored inline (8 / 12 / 16 / 20 / 24 px are the common multiples). No named tokens exist for spacing.

### Typography Scale
| Token | Value | Typical Usage |
|-------|-------|---------------|
| `--fs-0` | `12px` | Labels, badge text, table headers, captions |
| `--fs-1` | `14px` | Body text, inputs, metadata |
| `--fs-2` | `16px` | Default body, card titles, section text |
| `--fs-3` | `20px` | Section headings |
| `--fs-4` | `26px` | Page-level headings |
| `--fs-5` | `34px` | Hero / display text |

Font family: Inter with `ui-sans-serif` / system-ui fallback stack. Monospace: JetBrains Mono / Fira Code / Cascadia Code.

### Geometry Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `10px` | Default border-radius for cards, inputs, buttons |
| `--radius-pill` | `999px` | Pill / badge / chip shapes |
| `--maxw` | `1320px` | Container max-width |

### Motion Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--t-fast` | `120ms` | Micro-interactions (hover, focus ring) |
| `--t` | `160ms` | Component state transitions |

### Elevation
`--shadow`: dual-layer dark shadow (`0 1px 2px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.25)`) — calibrated for dark backgrounds where standard shadows are invisible.

---

## 2. Comparison to Vercel Geist Design System

Vercel's [Geist](https://vercel.com/geist) is a well-established reference for dark-first developer tooling UIs and serves as a meaningful comparison point for Dopamine's control-room dashboard aesthetic.

### Where Dopamine Aligns with Geist

| Dimension | Geist Approach | Dopamine |
|-----------|---------------|----------|
| **Dark-first palette** | Near-black canvas with layered surface elevations (`--ds-background-100/200/300`) | `--bg / --surface / --elevated` is the same three-layer hierarchy |
| **Semantic status signals** | `--ds-red / --ds-green / --ds-amber` as semantic intent tokens | `--bad / --ok / --warn` map directly to the same intent set |
| **Single interactive accent** | One primary brand color per product; all interactive elements derive from it | Single `--accent` amber; `--accent-press` is the only variant |
| **Font scale shape** | 6-step scale: 12/14/16/20/24/32px | 6-step scale: 12/14/16/20/26/34px — nearly identical; only the top two sizes differ |
| **Motion philosophy** | 150ms/200ms easing; snappy micro-interactions | 120ms/160ms — slightly faster, appropriate for a tool-centric interface |
| **CSS custom property theming** | Components expose CSS vars for overrides | SUI library does the same; our bridge maps them |

### Where Dopamine Differs — and Improvement Opportunities

| Gap | Geist Approach | Dopamine Today | Recommended Improvement |
|-----|---------------|----------------|------------------------|
| **Spacing scale** | Named 4px-base scale (`space-1` = 4px through `space-16` = 64px); consistent across all components | Magic numbers inline; 8/12/16/20/24px ad-hoc | Add `--space-1..8` tokens (4, 8, 12, 16, 24, 32, 48, 64px) to theme.css; adopt in components |
| **Semantic alias tokens** | `--ds-background-100/200`, `--ds-foreground-primary/secondary` sit above raw palette | Only raw palette tokens; no aliases | Alias to `--color-bg-page`, `--color-bg-surface`, `--color-text-primary`, `--color-text-secondary`, etc. Enables future light-mode or rebranding without touching per-component overrides |
| **Focus ring token** | `--ds-focus-ring` as a named token | `2px solid var(--accent)` hardcoded in app.css and `:focus-visible` rule | Introduce `--focus-ring: 2px solid var(--accent)` token; reference in app.css + SUI bridge |
| **Line-height tokens** | `--ds-leading-tight/normal/relaxed` | Only inline `line-height: 1.55` on body | Add `--lh-tight: 1.25`, `--lh-normal: 1.5`, `--lh-relaxed: 1.7` tokens |
| **Component-level semantic overrides** | Library-provided component tokens (e.g. `--button-primary-background`) separate from palette | Library component vars mapped directly to palette tokens via SUI bridge | Consider one semantic indirection layer (e.g. `--color-interactive` → `var(--accent)`) so changing the interactive color is a single-token change |

### Overall Assessment

Dopamine's token system is **structurally sound and purposeful** for its domain. The primary improvements are:
1. A **formal spacing scale** to eliminate magic numbers in component layout.
2. **Semantic alias tokens** above the raw palette to decouple visual identity from structural roles — enabling future light-mode or rebranding without cascading component edits.
3. A dedicated `--focus-ring` token and `--lh-*` line-height tokens to complete the primitive set.

These are additive improvements; no existing tokens need to change.

---

## 3. Adoption Strategy

### Approach

We adopt `@juspay/svelte-ui-components` (SUI) as the component layer for all UI primitives. The theme bridge (`web/src/lib/sui-theme.css`) overrides every library CSS custom property that controls visual output, mapping it to Dopamine's existing design tokens. This approach means:

1. **No library source changes required** — SUI is a pure npm dependency.
2. **Zero runtime overhead** — all theming is CSS custom property resolution at paint time; no JS involved.
3. **Incremental migration** — bespoke components can be replaced one at a time; the bridge applies globally from day one.
4. **Dark-mode first** — our tokens are dark by design; no `prefers-color-scheme` adapter is needed for the initial product.
5. **Token updates propagate automatically** — changing `--accent` in theme.css automatically re-themes all SUI components because the bridge uses `var(--accent)` references.

### Import Order

```
web/src/app.css
  └── @import './lib/theme.css'       ← raw palette + geometry + motion tokens
  └── @import './lib/sui-theme.css'   ← SUI var overrides (references theme.css vars via var())
```

Library components pick up the bridge overrides through the standard CSS custom property cascade. No scoping or attribute selectors are needed.

### What Is and Is Not Themed

The bridge overrides **color, background, border, border-radius, font-family, font-size, font-weight, box-shadow, and transition** properties. It intentionally leaves **sizing, padding, gap, width, height, and positioning** vars at their library defaults — these are layout concerns and should be adjusted per-component at usage sites if needed.

---

## 4. Component Mapping Table

| Dopamine Bespoke | Library Replacement | Migration Notes |
|-----------------|--------------------|-|
| `Chip.svelte` | `Pill` | Generic chip → `<Pill text={label} />` |
| `CategoryChip.svelte` | `Pill` | Add `onclick` prop for filter activation; `classes` for active state styling |
| `TagChip.svelte` | `Pill` | Use `dismissible` + `ondismiss` for removable filter tags |
| `Spinner.svelte` | `Loader` | Drop-in replacement; `Loader` renders a circular spinner by default |
| `EmptyState.svelte` (bespoke) | `EmptyState` | `title` + `description` props; optional icon via `{#snippet icon()}` |
| `SearchBox.svelte` | `Input` | Wrap SUI `Input`; pass search icon via `children` snippet; sync `value` with `$bindable` |
| Creator avatar in `CreatorLink.svelte` | `Avatar` | `src={creator.avatar}` `name={creator.handle}` `size="small"`; keep outer `CreatorLink` wrapper |
| Video thumbnails in `VideoCard.svelte` | `Img` | `src={thumb}` `alt={title}` `fallback={placeholder}`; border-radius from `--image-border-radius` token |
| `ActionableItem` install/code blocks | `Snippet` | `text={codeText}` `prompt="$"` `showCopyButton` `oncopy={trackCopy}` |
| Knowledge-base tools table | `Table` | `tableHeaders={cols}` `tableData={rows}` `sortable`; use `cell` snippet for rich cell content (links, badges) |
| `SectionNav.svelte` | `Tabs` | `items={categoryLabels}` `activeIndex={activeIdx}` `onchange={handleNav}`; URL sync stays in the wrapper |
| `RelatedRail.svelte` | `Scroller` | `direction="horizontal"` `showArrows` `showGradient` `dragToScroll`; children are `VideoCard` instances |
| Sidebar info cards | `Card` | `title` + `description` + `{#snippet children()}` for body content |
| Category / tag filter dropdowns | `Select` | Single-select or multi-select; `pill` variant for selected values |
| Creator / tag hover hints | `Tooltip` | Wrap trigger element; `content` snippet for rich tooltip body |
| Dashboard top-bar action buttons | `Button` | Replace `<button>` elements; use `icon` snippet for icon-only variants |
| Sort / filter context menu | `Menu` | `items: MenuItem[]` array; `onselect` handler; `trigger` snippet for custom trigger |
| Verification overlays on VideoCard | `Badge` | Positioned overlay; `--badge-background` resolves to `--ok/--warn/--bad` via classes |
| `VideoCard.svelte` | **Keep bespoke** | Complex thumbnail + overlay + metadata layout; too domain-specific for a generic card |
| `VideoGrid.svelte` | **Keep bespoke** | Masonry / responsive grid layout; SUI has no grid component |
| `Breadcrumbs.svelte` | **Keep bespoke** | Custom routing breadcrumb; the component is already minimal |
| `TopBar.svelte` | **Keep bespoke** | App-specific nav bar; use SUI `Toolbar` structure as internal reference |
| `CreatorLink.svelte` | **Keep bespoke** (+ `Avatar` inside) | Composite component linking avatar + handle; replace inner avatar with SUI `Avatar` |
| `VerificationBadge.svelte` | **Keep bespoke** | Custom SVG badge with domain-specific status color logic; no direct SUI equivalent |
