# Design System & Migration Spec — Dopamine × @juspay/svelte-ui-components

**Date:** 2026-05-31  
**Status:** Adopted — ready for phased execution  
**Scope:** `web/` SvelteKit SPA  
**Library:** `@juspay/svelte-ui-components@2.19.2`

---

## 1. Current-State Audit Summary

### Token inventory (theme.css)

| Group | Tokens present | Notable gaps |
|-------|---------------|--------------|
| Surfaces | `--bg`, `--surface`, `--elevated`, `--border` | No tonal elevation scale; no `--surface-hover` / `--surface-interactive` |
| Text | `--text`, `--muted`, `--faint` | No `--text-on-accent` / `--text-disabled` |
| Accent | `--accent`, `--accent-press` | No `--accent-subtle` alias for the recurring `color-mix(in srgb, var(--accent) 12%, transparent)` idiom |
| Status | `--ok`, `--warn`, `--neutral`, `--bad` | Status backgrounds not tokenised; hardcoded `rgba` in `tools/+page.svelte` |
| Geometry | `--radius`, `--radius-pill`, `--maxw` | No `--radius-xs`/`--radius-sm`; no derived scale |
| Motion | `--t-fast`, `--t` | No named easing curves |
| Type | `--fs-0`–`--fs-5` | No weight or line-height tokens |
| Shadow | `--shadow` | No `--shadow-sm` / `--shadow-lg` |
| Spacing | **none** | Zero spacing tokens; `tag/[tag]/+page.svelte` references `--space-1`–`--space-5` and `--content-max` that resolve to nothing, silently breaking layout |
| Category colours | **none in CSS** | Hardcoded in `format.ts` as JS Record — cannot be overridden via CSS theming |

### Component usage (as-is)

| Dopamine component | SUI already used | Issues |
|-------------------|-----------------|--------|
| `VideoCard` | `Img` | Hardcoded `rgba(0,0,0,0.75)` scrim + `#fff` duration text |
| `CategoryChip` / `TagChip` / `Chip` | `Pill` | Identical `<style>` block copy-pasted 3× |
| `RelatedRail` | `Scroller` + `Img` | Same scrim hardcode; font sizes below `--fs-0` |
| `ActionableItem` | `Pill` + `Snippet` | Manual expand/collapse; bespoke URL-status colours |
| `EmptyState` | `SuiEmptyState` | Correct; icon at hardcoded 32px |
| `Spinner` | `Loader` | `size` prop has no effect — font-size does not propagate into Loader SVG |
| `SectionNav` | Nothing | Manually duplicates tab-bar CSS that SUI Tabs already provides |
| `TopBar`, `Breadcrumbs`, `VideoGrid`, `CreatorLink` | Nothing | Bespoke; appropriate |
| `SearchBox` | Nothing | 4 routes re-implement it from scratch instead of reusing component |

### Route-level inconsistencies

- `tools/+page.svelte` — 3 raw `<select>` filters (should use SUI `Select`)
- `videos/+page.svelte` — 1 raw `<select>` filter; inline search; `font-size: 11px` below scale
- `kb/+page.svelte` — inline search; expand button 26×26px (below 44px WCAG target)
- `creators/+page.svelte` — inline search; `:focus` only (missing `:focus-visible`)
- `tag/[tag]/+page.svelte` — references `--space-1`–`--space-5` and `--content-max` (undefined → layout breaks)
- `video/[id]/+page.svelte` — bespoke `.score-bar` (should use SUI `Progress`)

### Tools page mobile table

The 5-column `Table` with `min-width` totalling >800px forces horizontal scroll on all phones. There is no `@media` rule to collapse columns or switch to cards. This is the most severe mobile regression.

---

## 2. Two-Tier Token Taxonomy

### Tier 0 — Primitives (namespace `--dp-*`)

Never referenced directly in component `.svelte` files. Only consumed by Tier 1 semantic tokens.

```
Amber scale:  --dp-amber-50 … --dp-amber-900     (OKLCH, hue ~83)
Neutral scale: --dp-neutral-50 … --dp-neutral-950 (OKLCH, near-zero chroma, hue ~84)
Status:        --dp-green-500, --dp-yellow-500, --dp-red-500, --dp-blue-500
Spacing:       --dp-space-1 (4px) … --dp-space-16 (64px)
Type sizes:    --dp-font-size-0 (12px) … --dp-font-size-5 (34px)
Type weights:  --dp-font-weight-regular/medium/semibold/bold
Line heights:  --dp-line-height-tight/snug/normal/relaxed
Radius:        --dp-radius-xs(3px) … --dp-radius-pill(9999px)  [calc-derived from 10px base]
Duration:      --dp-duration-instant(50ms) … --dp-duration-slower(450ms)
Easing:        --dp-ease-out/in/in-out/spring
Z-index:       --dp-layer-base(0) … --dp-layer-tooltip(600)
```

### Tier 1 — Semantic tokens (backward-compatible with existing names)

The existing `theme.css` tokens (`--bg`, `--surface`, `--elevated`, `--border`, `--text`, `--muted`, `--faint`, `--accent`, `--accent-press`, `--ok`, `--warn`, `--neutral`, `--bad`, `--radius`, `--radius-pill`, `--maxw`, `--t-fast`, `--t`, `--fs-0`–`--fs-5`, `--shadow`) are **preserved unchanged** and resolve to the same hex values as before.

`design-system.css` adds these **new** semantic tokens alongside them:

```
Surfaces (tonal elevation):
  --accent-subtle       → color-mix(in srgb, var(--accent) 12%, transparent)
  --scrim               → rgba(0,0,0,0.75)

Spacing scale (fixes tag/[tag] breakage):
  --space-1: 4px  --space-2: 8px   --space-3: 12px  --space-4: 16px
  --space-5: 20px --space-6: 24px  --space-8: 32px  --space-12: 48px  --space-16: 64px
  --content-max: var(--maxw)        (alias fixes tag/[tag]/+page.svelte)

Radius variants:
  --radius-xs: 3px
  --radius-sm: 4px
  --radius-md: 7px
  --radius-xl: 16px
  --radius-2xl: 24px

Type weights:
  --fw-regular: 400  --fw-medium: 500  --fw-semibold: 600  --fw-bold: 700

Line heights:
  --lh-tight: 1.2   --lh-normal: 1.5   --lh-relaxed: 1.7

Easing:
  --ease-out / --ease-in / --ease-in-out / --ease-spring

Motion composites:
  --transition-micro / --transition-base / --transition-enter / --transition-exit

Z-index layer scale:
  --z-base: 0   --z-raised: 10   --z-dropdown: 100   --z-sticky: 200
  --z-overlay-bg: 300   --z-overlay: 400   --z-toast: 500   --z-tooltip: 600

Shadow scale:
  --shadow-sm   --shadow-lg   (augment existing --shadow)

Status alpha backgrounds:
  --ok-bg   --warn-bg   --bad-bg   --neutral-bg
  (replaces hardcoded rgba in tools/+page.svelte)

Category CSS custom properties (12 canonical categories):
  --cat-{slug}-text / --cat-{slug}-bg   for each of:
  tech, ai, design, business, education, finance, interior,
  food, travel, fitness, entertainment, other
```

### Tier 2 — Library component bindings

`design-system.css` maps every `@juspay/svelte-ui-components` CSS variable to Tier 1 semantic tokens on `:root`. Component `.svelte` files never set these — they inherit globally.

Full binding block is in `web/src/lib/design-system.css` (see §4 / file deliverable).

---

## 3. Component Mapping Table

| Dopamine component | Library component | Key props | Notes |
|-------------------|------------------|-----------|-------|
| `SectionNav` | `Tabs` | `items`, `activeIndex`, `onchange` | Wrap with IntersectionObserver; remove ~90 lines of custom CSS |
| Filter `<select>` in tools/videos | `Select` | `items`, `multiple?`, `searchable` | Replaces 4 raw selects + custom `.filter-select` CSS |
| Inline search in tools/videos/kb/creators | `Input` | `value`, `addFocusColor`, `onInput` | Or reuse existing `SearchBox` component |
| Implementability score bar | `Progress` | `value`, `max={10}`, `showLabel?` | Replaces `.score-bar-wrap/.score-bar/.score-fill` |
| `ActionableItem` expand/collapse | `Accordion` | `expand` | Animate open/close; trigger button remains bespoke |
| `Spinner` | `Loader` (already) | fix via `--loader-size` | Use CSS var not font-size wrapper |
| `EmptyState` | `EmptyState` (already) | — | Already correct; fix icon to use type-scale token |
| `VideoCard` body/footer | `Card` (optional) | `children`, `title`, `description` | Use only for simple info panels; stretched-link stays bespoke |
| Creator page header | `Avatar` | `alt`, `name`, `size='large'` | Fallback to initials if no image |
| `VerificationBadge` dot mode | `Tooltip` wrapper | `text`, `position='top'` | Fixes colour-only a11y gap |
| `RelativeTime` on video dates | `RelativeTime` | `date`, `tooltip`, `format='short'` | Replaces `fmtDate()` spans |
| Grid loading state | `Shimmer` | `--shimmer-*` | Replace center Spinner with 12-card Shimmer grid |
| Chips (all 3) | `Pill` (already) | — | Consolidate triplicated style block into single `Chip.svelte` |
| `Breadcrumbs` | None (bespoke) | — | No SUI equivalent; keep custom |
| `TopBar` | None (bespoke) | — | No SUI nav equivalent; keep custom |
| `VideoGrid` | None (bespoke) | — | IntersectionObserver grid; keep custom |
| `CreatorLink` | None (bespoke) | — | Simple anchor; keep custom |

---

## 4. Centralized Theming Strategy

**File architecture:**

```
web/src/
  app.css                     ← imports in order:
    @import './lib/theme.css'       (existing — primitives + legacy tokens)
    @import './lib/design-system.css'   (NEW — extensions + library bindings)
    @import './lib/sui-theme.css'   (legacy — can be emptied as design-system.css
                                     absorbs its content in Phase 2)
```

**Single source of truth:** `design-system.css` is the master theme file going forward. It:

1. Extends `theme.css` with new semantic tokens (non-breaking — existing token names unchanged)
2. Binds all `@juspay/svelte-ui-components` CSS variables to Dopamine semantic tokens on `:root`
3. Consolidates the 12 category colour tokens into CSS custom properties
4. Fixes the silent `--space-*` / `--content-max` breakage in `tag/[tag]/+page.svelte`

**Upgrade path:** After all components are migrated (Phase 4), `sui-theme.css` can be deleted and its import removed from `app.css` since `design-system.css` provides a superset of those bindings.

**Theme switching:** All semantic tokens resolve under `:root`. A future `.dark` or `[data-theme]` class override on `<html>` need only redefine the Tier 1 semantic tokens — no component changes required.

---

## 5. Phased Migration Plan

### Phase 0 — Token foundation (DONE in this commit)

- [x] Write `web/src/lib/design-system.css` with full token extensions + library bindings
- [x] Add `@import './lib/design-system.css'` to `app.css`
- [x] Build passes with zero new warnings

### Phase 1 — Fix silent breakages (no component migration)

**Target files:** `tag/[tag]/+page.svelte`, `tools/+page.svelte`, all components

| Task | File | Change |
|------|------|--------|
| Use `--space-*` tokens | `tag/[tag]/+page.svelte` | Already references `--space-1`–`--space-5` — now they resolve correctly |
| Use `--content-max` | `tag/[tag]/+page.svelte` | Replace `--content-max` references (now defined as `var(--maxw)`) |
| Replace hardcoded `rgba` scrims | `VideoCard.svelte`, `RelatedRail.svelte` | `rgba(0,0,0,0.75)` → `var(--scrim)` |
| Replace hardcoded `#fff` on scrims | same | `color: #fff` → `color: var(--text)` |
| Replace `color-mix(in srgb, var(--accent) 12%, transparent)` × 12 | VideoCard, TopBar, SectionNav, Breadcrumbs, ActionableItem, 4 routes | → `var(--accent-subtle)` |
| Replace hardcoded status `rgba` | `tools/+page.svelte` lines 118–121 | → `var(--ok-bg)`, `var(--warn-bg)`, `var(--bad-bg)`, `var(--neutral-bg)` |
| Fix `font-size: 10px`/`11px` | `RelatedRail.svelte`, `videos/+page.svelte` | → `var(--fs-0)` |
| Fix `font-size: 14px` | `TopBar.svelte` | → `var(--fs-1)` |
| Fix Spinner size prop | `Spinner.svelte` | Use `--loader-size` CSS var instead of font-size wrapper |
| Fix `aria-current` value | `SectionNav.svelte` | `'true'` → `'location'` |
| Fix kb expand-btn touch target | `kb/+page.svelte` | `min-width: 44px; min-height: 44px` |
| Fix creators search focus ring | `creators/+page.svelte` | Add `:focus-visible` rule |
| Consolidate chip style block | `Chip.svelte`, `CategoryChip.svelte`, `TagChip.svelte` | Move shared CSS to `Chip.svelte` only |

### Phase 2 — SUI component migrations (high value, low risk)

**Criteria:** removes the most custom CSS per effort unit, no behaviour change.

| Priority | Component | Migration | Effort |
|----------|-----------|-----------|--------|
| 1 | `SectionNav` → `Tabs` | Replace bespoke tab-bar markup + ~90 CSS lines with `<Tabs items={...} activeIndex onchange>` | Medium |
| 2 | Filter `<select>` in `/tools` (×3) | `<Select items searchable>` | Low |
| 3 | Filter `<select>` in `/videos` (×1) | `<Select items>` | Low |
| 4 | Inline search in `/videos`, `/tools`, `/kb`, `/creators` | `<Input value addFocusColor onInput>` or reuse `SearchBox` | Low |
| 5 | `ActionableItem` expand/collapse | `<Accordion expand={expanded}>` for animation | Low |
| 6 | `VerificationBadge` dot mode | Wrap in `<Tooltip text={title}>` | Low |

### Phase 3 — Richer component migrations

| Priority | Component | Migration | Notes |
|----------|-----------|-----------|-------|
| 7 | Implementability score bar | `<Progress value={detail.implementability} max={10}>` | `video/[id]/+page.svelte` |
| 8 | Loading grid skeleton | Replace center `Spinner` with 12 `<Shimmer>` placeholders | `VideoGrid.svelte` |
| 9 | Creator page header | `<Avatar name={fullName} size='large'>` | `creator/[name]/+page.svelte` |
| 10 | Video dates | `<RelativeTime date={record.date} tooltip format='short'>` | VideoCard + RelatedRail |
| 11 | Simple info panels | `<Card>` for creator stats, tool detail modals | Not VideoCard main layout |

### Phase 4 — Category colour migration + cleanup

| Task | Detail |
|------|--------|
| Category tokens in CSS | `catColor`/`catBg` functions in `format.ts` read `--cat-{slug}-text` / `--cat-{slug}-bg` via `getComputedStyle` instead of hardcoded hex |
| Remove inline `style=` category attributes | `CategoryChip`, `category/[cat]/+page.svelte`, `videos/+page.svelte` use CSS classes or data attributes |
| Delete `sui-theme.css` | `design-system.css` is a superset; remove the old file and its `app.css` import |
| Audit remaining raw px values | Sweep all component style blocks; replace with `--space-*` / `--radius-*` / `--fs-*` tokens |

### Tools page mobile table fix (Phase 2, alongside select migration)

**Problem:** 5-column table with minimum total width >800px — unusable on phones.

**Recommended approach — option (b): card layout below 640px**

```css
/* In tools/+page.svelte or a shared table override */
@media (max-width: 640px) {
  .table-container-wrap {
    display: none; /* hide table */
  }
  .tools-card-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
}
```

Below 640px, render the tool list as `<ActionableItem>` cards (already mobile-friendly). The `ActionableItem` already handles expand/collapse and shows all relevant data. This avoids the complexity of column collapsing and reuses an existing component.

**Alternative — option (a): column hiding at ≤640px**

```css
@media (max-width: 640px) {
  /* Hide Source and Category columns; keep Tool / Type / Status */
  .table-container-wrap th:nth-child(4),
  .table-container-wrap td:nth-child(4),
  .table-container-wrap th:nth-child(5),
  .table-container-wrap td:nth-child(5) {
    display: none;
  }
}
```

Option (b) is preferred because it preserves full information access via the existing expand-to-details pattern.

---

## 6. Invariants to enforce going forward

1. **No raw `px` spacing values in component `<style>` blocks.** Use `--space-*` tokens.
2. **No raw hex colours.** All colours via semantic tokens.
3. **No raw `z-index` numbers.** Use `--z-*` layer tokens.
4. **`color-mix(in srgb, var(--accent) 12%, transparent)` is banned inline.** Use `var(--accent-subtle)`.
5. **Library components inherit theme automatically.** Never set `style=` on a SUI component for colour/border/radius — override via CSS vars in `design-system.css` if a global change is needed, or via a scoped `:root`-level block on the page if a one-off override is needed.
6. **Category colours live in CSS, not JS.** `format.ts` may read CSS vars; it must not hardcode palette values.
