# Color System: tailwind-oklch Migration Status

_2026-02-21_

This document audits the current state of our OKLCH color migration — what's fully integrated with the `tailwind-oklch` plugin, what's partially responsive, and what remains outside the system.

## How the system works

The `tailwind-oklch` plugin provides three composable axes for every color:

- **Luminance contrast (L):** 0–10 scale that auto-flips between light and dark mode
- **Chroma (C):** Named stops from `lo` (0.02) to `hi` (0.25)
- **Hue (H):** Named hues like `primary`, `accent`, `neutral`, etc.

A shorthand like `bg-1-mlo-primary` sets all three axes and auto-flips. The plugin also provides single-axis utilities (`bg-lc-up-1`, `text-c-hi`, `bg-h-accent`) for overriding one axis at a time.

## Tier 1: Fully oklch-responsive tokens

These tokens use the plugin's `--l-*`, `--c-*`, and `--hue-*` variables on all three axes. They auto-flip for dark mode AND respond to hue changes from the theme editor.

| Token               | Definition                                            | Notes                                |
| ------------------- | ----------------------------------------------------- | ------------------------------------ |
| `primary`           | `oklch(var(--l-5) var(--c-hi) var(--hue-primary))`    | Main brand color                     |
| `primary-foresoft`  | `oklch(var(--l-7) var(--c-hi) var(--hue-primary))`    | Interactive purple (links, borders)  |
| `accent`            | `oklch(var(--l-5) var(--c-hi) var(--hue-accent))`     | Accent brand color                   |
| `accent-foresoft`   | `oklch(var(--l-7) var(--c-hi) var(--hue-accent))`     | Interactive accent                   |
| `accent-foreground` | `oklch(var(--l-fore) var(--c-mlo) var(--hue-accent))` | Body text on accent (language names) |
| `accent-invert`     | `oklch(var(--l-1) var(--c-mid) var(--hue-accent))`    | Inverted accent surface              |

All shorthand utilities like `bg-1-mlo-primary`, `text-6-mhi-success`, `border-4-mid-danger` are also fully responsive.

## Tier 2: Hue-responsive, L/C hardcoded per mode

These tokens reference `var(--hue-primary)` or `var(--hue-neutral)` so they respond to theme hue changes. But luminance and chroma are hardcoded numbers with separate `:root` / `.dark` blocks — they don't use the plugin's `--l-*` scale.

| Token              | Light                           | Dark                            | Hue var |
| ------------------ | ------------------------------- | ------------------------------- | ------- |
| `background`       | `oklch(0.96 0.02 hue-primary)`  | `oklch(0.22 0.03 hue-primary)`  | primary |
| `foreground`       | `oklch(0.30 0.06 hue-primary)`  | `oklch(0.84 0.04 hue-primary)`  | primary |
| `border`           | `oklch(0.85 0.03 hue-primary)`  | `oklch(0.42 0.04 hue-primary)`  | primary |
| `ring`             | `oklch(0.58 0.22 hue-primary)`  | `oklch(0.55 0.18 hue-primary)`  | primary |
| `secondary`        | `oklch(0.97 0.005 hue-neutral)` | `oklch(0.28 0.02 hue-neutral)`  | neutral |
| `secondary-fg`     | `oklch(0.22 0.03 hue-neutral)`  | `oklch(0.84 0.005 hue-neutral)` | neutral |
| `muted`            | `oklch(0.97 0.005 hue-neutral)` | `oklch(0.28 0.02 hue-neutral)`  | neutral |
| `muted-foreground` | `oklch(0.55 0.01 hue-neutral)`  | `oklch(0.65 0.01 hue-neutral)`  | neutral |
| `input`            | `oklch(0.93 0.005 hue-neutral)` | `oklch(0.28 0.02 hue-neutral)`  | neutral |
| `card-foreground`  | `oklch(0.15 0.02 hue-neutral)`  | `oklch(0.84 0.04 hue-primary)`  | mixed!  |
| `sidebar-*`        | various                         | various                         | mixed   |

**Why they can't simply use `--l-*` vars:** The light and dark values are _asymmetric_ — they've been hand-tuned per mode rather than following the plugin's linear flip. For example, `muted-foreground` uses L=0.55 in light mode and L=0.65 in dark mode, but the plugin's `--l-5` gives 0.55 in light and 0.52 in dark. The dark value is intentionally brighter than the symmetric scale would produce.

**Can `text-muted-foreground` become `text-5-lo-neutral`?** Almost but not quite. Three issues:

1. **Asymmetric luminance:** L=0.55 light / L=0.65 dark doesn't map to any single scale position
2. **Sub-minimum chroma:** C=0.01 is below the lowest named stop `--c-lo` (0.02)
3. **The `lc-down-*` approach fails too:** `text-lc-down-5` from `text-foreground` gives L=0.55 in light (correct) but L=0.52 in dark (too dark — actual target is 0.65)

If we're willing to accept the symmetric scale's values (close but not identical), many of these tokens _could_ be expressed as shorthands. The trade-off is precision vs. simplicity.

## Tier 2b: Hue-responsive in only one mode

| Token                | Light                          | Dark                           | Issue                                     |
| -------------------- | ------------------------------ | ------------------------------ | ----------------------------------------- |
| `card`               | `oklch(1 0 0)`                 | `oklch(0.2 0.05 hue-neutral)`  | Pure white in light — no hue influence    |
| `popover`            | `oklch(1 0 0)`                 | `oklch(0.15 0.03 hue-neutral)` | Pure white in light — no hue influence    |
| `primary-foreground` | `oklch(0.93 0.02 hue-primary)` | same                           | Fixed L — intentional for on-primary text |

## Tier 3: Fully hardcoded (no oklch vars)

These don't participate in the oklch system at all:

| Token                       | Value                                             | Reason                                |
| --------------------------- | ------------------------------------------------- | ------------------------------------- |
| `destructive`               | `oklch(0.55 0.18 25)` / `oklch(0.42 0.18 25)`     | Fixed red hue, shouldn't follow theme |
| `destructive-foreground`    | `oklch(0.98 0.005 250)` / `oklch(0.92 0.005 250)` | Fixed                                 |
| `chart-1` through `chart-5` | hardcoded oklch values                            | Data visualization colors             |
| `shadow-color-*`            | `rgba(0,0,0,...)` / `rgba(255,255,255,...)`       | Shadow opacity                        |

## Tier 4: Legacy Tailwind palette colors

These files use standard Tailwind color names (`purple-600`, `slate-300`, `red-500`, etc.) entirely outside the oklch system:

**Homepage (not yet migrated):**

- `src/routes/-homepage/hero-section.tsx` — extensive `dark:` prefixes, `bg-white/10`, slate, purple, indigo, green, blue, yellow gradients
- `src/routes/-homepage/spaced-repetition-section.tsx` — purple, violet, indigo, green, blue, yellow, red
- `src/routes/-homepage/social-learning-section.tsx` — rose, pink, orange
- `src/routes/-homepage/crowd-sourced-section.tsx` — green, emerald, teal
- `src/routes/-homepage/footer-nav.tsx` — slate, purple, blue, green, red, indigo
- `src/routes/-homepage/under-construction.tsx` — indigo, purple
- `src/routes/index.tsx` — slate, `bg-white/10`, `bg-black/10`, extensive `dark:` prefixes
- `src/styles/globals.css` `.moving-glass-card` — `bg-white/10`, `dark:bg-white/5`

**Scattered in the app:**

- `src/components/card-pieces/card-status-dropdown.tsx` — `purple-600`, `green-600`, `green-500` (card learning status colors)
- `src/components/intros/deck-new-intro.tsx` — `amber-500`, `amber-600` (warning callout)
- `src/components/playlists/update-playlist-dialog.tsx` — `red-500` (validation error)
- `src/components/phrases/inline-phrase-creator.tsx` — `red-500` (validation error)
- `src/components/playlists/manage-playlist-phrases-dialog.tsx` — `red-500` (validation error)
- `src/components/flagged.tsx` — `yellow-500` (debug border)
- `src/components/ui/badge.tsx` `success` variant — `green-600`, `green-100`
- `src/components/profile-with-relationship.tsx` — `green-600` (online indicator)
- `src/components/review/select-phrases-to-add-to-review.tsx` — `purple-500`
- `src/components/card-pieces/add-translations.tsx` — `gray-200`, `gray-700`

## Tier 5: Opacity-tinted tokens (partially involved)

These use semantic tokens but apply Tailwind opacity modifiers (`/50`, `/70`, etc.), which bypasses the oklch luminance approach:

**Common patterns:**

- `bg-card/50`, `bg-card/95`, `bg-muted/50`, `bg-muted/30` — translucent surfaces
- `text-muted-foreground/70`, `text-muted-foreground/50` — dimmed text
- `text-foreground/80`, `text-foreground/70`, `bg-foreground/5`, `bg-foreground/10` — subtle foreground tints
- `bg-destructive/20`, `border-destructive/50` — error backgrounds
- `text-secondary-foreground/80`, `bg-secondary/50`, `border-secondary-foreground/10` — neutral button tints
- `text-accent-foreground/70`, `border-accent-foreground/20` — accent badge
- `border-border/50`, `border-border/60` — subtle borders
- `bg-black/80`, `bg-black/50` — overlays (dialog, drawer, sheet backdrops)

Some of these have clear oklch equivalents (e.g. `bg-muted/50` → `bg-1-lo-neutral`), but others serve different purposes (overlays need actual transparency for the blur-through effect).

## Future work

1. **Homepage migration:** The homepage sections are the largest remaining pocket of legacy colors. They use gradients, `dark:` prefixes, and named Tailwind colors extensively.
2. **Validation error colors:** Several form components use `red-500` / `border-red-500` for validation errors — these could use `text-destructive` / `border-destructive` instead.
3. **Status indicator colors:** Card status (`purple-600`, `green-600`) and online indicators (`green-600`) could use oklch hues like `text-6-mhi-primary` and `text-6-mhi-success`.
4. **Opacity-to-luminance migration:** Many `bg-muted/50` and `text-foreground/80` patterns could be replaced with oklch luminance steps for more consistent cross-monitor appearance.
5. **Plugin enhancement for asymmetric tokens:** To fully replace Tier 2 tokens with shorthands, the plugin would need to support asymmetric light/dark overrides or custom scale curves. Without that, tokens like `muted-foreground` must remain manually defined.
6. **Nested `.dark` support:** The plugin uses `:root:not(.dark)` for its luminance scale, so nested `.dark` divs don't flip. This only matters for demo pages but is worth an upstream fix.
