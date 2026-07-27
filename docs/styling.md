# Styling

## OKLCH Color System

This project uses the **`tailwind-oklch`** cascade-first OKLCH color system (npm, `^0.7.0`, MIT; pure CSS, no JS plugin — `@import 'tailwind-oklch'` in `globals.css`). Every color is composed from three independent axes: **luminance** (`lum`), **chroma** (`chroma`), and **hue** (`hue`). The system auto-flips between light and dark mode, so you almost never write `dark:`.

The guiding idea: **each class states one fact about one axis.** Hue and chroma flow _down the cascade_ from container seeders, so most elements only ever say what their luminance is.

### Say each axis once, as low in the tree as it changes

There are two kinds of class:

**Cascade seeders** set an axis for _everything below them_ and apply no property themselves. Put them near a component's root:

```
hue-primary · hue-danger · hue-success · …     seeds hue for descendants
chroma-mlow · chroma-high · …                     seeds chroma for descendants
```

**Per-property setters** apply exactly one CSS property from one axis. Luminance is the one you set constantly; chroma and hue inherit from a seeder (or the `:root` default) unless set explicitly:

```typescript
// A "generally green, generally lowkey" component: seed once at the top…
;<div className="hue-success chroma-mlow">
	{/* …then speak luminance inside */}
	<div className="bg-lum-2">
		<span className="text-con-mhigh">…</span>
		<hr className="border-con-low" />
	</div>
</div>
```

Because `:root` already seeds `hue-primary` + low chroma, a brand-colored surface often needs only `bg-lum-2`. Per-language dynamic theming keeps working automatically — it overrides the `--hue-*` variables everything resolves through.

Each property has the full trio; set only the axes that differ from what's inherited:

```typescript
className = 'bg-lum-2 bg-chroma-mlow bg-hue-primary' // all three explicit
className = 'text-con-mid text-chroma-high text-hue-info'
className = 'border-con-low border-chroma-mlow border-hue-primary'
className = 'hover:bg-lum-3' // luminance only; chroma+hue inherited
```

Property prefixes: `bg-`, `text-`, `border-`, `border-b-`, `from-`, `to-` (gradient stops).

### Luminance scale (`lum`)

`{prop}-lum-{1–10 | none | max}`. Numbered stops ride v0.7.0's **front-loaded** curve (fine steps near the page, opening toward the foreground) and measure contrast with the page; the pure poles sit _outside_ the numbers. The scale auto-flips between light and dark mode — **we use the library's native ramp**, with the top three light-mode stops lifted a little (`globals.css`, `@theme`) so the page and lightest cards don't read too dark; the dark half is untouched:

| Value  | Light mode   | Dark mode    | Meaning                        |
| ------ | ------------ | ------------ | ------------------------------ |
| `none` | 1.00 (white) | 0.00 (black) | The page color — zero contrast |
| `1`    | 0.95         | 0.185        | The page (`body`)              |
| `2`    | 0.915        | 0.215        | Subtle raised fill             |
| `3`    | 0.85         | 0.268        | Border / raised surface        |
| `5`    | 0.676        | 0.412        | Mid — solid brand fills        |
| `7`    | 0.481        | 0.593        | Prominent fills                |
| `9`    | 0.254        | 0.805        | Strong                         |
| `10`   | 0.13         | 0.92         | Near the max                   |
| `max`  | 0.00 (black) | 1.00 (white) | Full contrast                  |

Arbitrary luminance is a _direct_ L (`n/100`) and still auto-flips: `bg-lum-[93]` → L=0.93 in light, 0.07 in dark. (Note `lum-1…10` is a curved contrast ramp; `lum-[n]` is a raw L — two tools sharing a prefix.)

> **Migration note (v0.7.0):** the axis was renamed `lc`→`lum` and renumbered — poles moved out to `none`/`max`, a card is now `lum-2` (`lc-base`→`lum-1`, `lc-fore`→`lum-10`). Roughly, an old `lc-N` maps to `lum-N`; only the lightest surfaces shifted up a notch so `lc-0`/`lc-1` stay distinct. Retune the ramp in `globals.css` (`--lum-2: …`), never by hand-editing classes.

### Chroma stops (`chroma`)

`{prop}-chroma-{low | mlow | mid | mhigh | high | max}`, or the seeder `chroma-{…}`. These are _base_ values, **scaled per hue** (each hue's `--cscale-*` normalizes perceived saturation across hues) and **tapered toward white** (chroma eases to 0 near the light pole), so painted chroma is usually a bit below the base:

| Name    | Base | Use for                            |
| ------- | ---- | ---------------------------------- |
| `low`   | 0.02 | Backgrounds, muted surfaces        |
| `mlow`  | 0.05 | Tinted backgrounds, subtle borders |
| `mid`   | 0.09 | Medium saturation                  |
| `mhigh` | 0.13 | Prominent accents                  |
| `high`  | 0.17 | Vivid colors                       |
| `max`   | 0.25 | Fullest color the hue can display  |

The root uses `chroma-mid` (`__root.tsx`), so unless you set otherwise, all your
colours will have this middle saturation.

The library's `:root` defaults every property to `chroma-low` (0.02, effectively
grey), which is what Base UI portals get — they mount into `<body>`, outside the
root route's element.

Arbitrary chroma is `n/100`: `border-chroma-[6]` → chroma 0.06. We keep the library's per-hue scale but soften **`--chroma-taper`** to `8` in `globals.css` — the default (`3`) desaturates light surfaces so hard that backgrounds and language badges read as gray. Lower it toward `3` to mute light surfaces further; raise it to flatten. (Semantic tokens like `primary` use `chroma-max` _raw_, bypassing scale + taper, so the brand stays vivid regardless.)

### Available hues (`hue`)

`{prop}-hue-{…}` or the seeder `hue-{…}`. App palette (overridden in `globals.css`): `primary` (300), `accent` (175), `neutral` (270); plus `success` (145), `warning` (55), `danger` (15), `info` (220). `tailwind-oklch` has **no neutral hue** of its own (a neutral is the absence of chroma), so `globals.css` defines both `--hue-neutral` and its `--cscale-neutral`. Dynamic per-language hue is applied as inline `--hue-*` / axis-var style (`lang-theme.ts`), not a utility.

### Relative adjustments and self-solving contrast

Nudge off the _nearest absolute_ luminance without rewriting it — ideal for hover/active states (**`bg` and `text` only**; gradients/borders have no `up`/`down`):

```typescript
className = 'bg-lum-2 hover:bg-lum-up-1' // one step more contrast on hover
className = 'text-lum-8 group-hover:text-lum-down-1' // one step less
```

`{bg,text}-lum-up-{1–5}` / `-down-{1–5}`. Adjustments **don't compound**: a nudge always measures from the nearest ancestor's absolute `lum-N`, never from an already-nudged value.

> ⚠️ **Don't put `bg-lum-up/down` on the same element that sets a base `bg-lum-N`** (e.g. `bg-lum-8 hover:bg-lum-up-1`). v0.7.0's bg nudge rewrites `--bg-l`, which the base's `--bg-anchor-l: var(--bg-l)` then references back — a custom-property cycle that voids `background-color` to **transparent**. For a hover on a coloured surface, use an absolute stop instead (`bg-lum-8 hover:bg-lum-9`). Text nudges are safe (they don't rewrite `--tx-l`), and `bg-lum-up` is fine on an element whose anchor comes from an _ancestor_.

To let an element pick a luminance that contrasts with **its own background** — light _or_ dark, no `dark:` — use `con-*` (`text-con-*`, `border-con-*`, `outline-con-*`), with words reading as _how much_ contrast (faint → stark): `low mlow mid mhigh high max`. `max` clamps to pure black/white.

```typescript
className = 'text-con-high' // stark against whatever surface this lands on
className = 'border-con-mlow' // a soft step off the surface
```

### Semantic color tokens

Defined in `globals.css`, these bridge the OKLCH scale with traditional Tailwind tokens. Being raw `oklch()`, they **bypass the per-hue scale/taper**, so brand chroma is pinned at `chroma-max` (0.25) directly:

| Token                                  | Definition                      | Notes                                                                 |
| -------------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `primary`                              | lum-5, chroma-max, hue-primary  | Auto-flips                                                            |
| `primary-foresoft`                     | lum-7, chroma-max, hue-primary  | Auto-flips; the "interactive purple" for links, soft buttons, borders |
| `primary-foreground`                   | Fixed L=0.93                    | Always near-white — for text ON primary surfaces only                 |
| `accent` / `accent-foresoft`           | lum-5/7, chroma-max, hue-accent | Auto-flips                                                            |
| `accent-foreground`                    | lum-10, chroma-mlow, hue-accent | Auto-flips; used as body text (language names)                        |
| `foreground`, `muted-foreground`, etc. | Static per-mode                 | Defined in `:root` and `.dark` blocks                                 |

### Cards are white paper on a tinted page

A card is pure white on a 0.96 page in light mode, and _darker_ than the page in
dark mode (0.20 vs 0.22) — it recedes toward the pole both ways, matching no
`lum-N`. The only stop below `lum-1` is the pure pole, which in dark mode is
black. So `bg-card` and `bg-popover` stay semantic tokens.

### What `con-*` measures against

`text-con-*` reads `--bg-l`, which only the `bg-lum-*` utilities set. Two
surfaces don't set it:

- **Gradients.** `from-lum-*`/`to-lum-*` write `--gf-l`/`--gt-l`. `text-con-high`
  on a gradient tile measures the page instead and inverts — dark text on
  mid-purple. Use `text-primary-foreground`, or add a `bg-lum-N` matching the
  first stop.
- **Semantic tokens**, including `bg-card`. Inside a white card, `con-*` measures
  the page's 0.95 rather than 1.0 — off by 0.05, invisible.

`:root` defaults `--bg-l` to `lum-5`, so an element with no `bg-lum-*` ancestor
at all resolves `text-con-mhigh` to L 0.256. `body` sets `bg-lum-1`, so this only
bites inside portals.

### When to use what

**When an element sets its own `bg-lum-*`, state its text and border with `lum-*`
too. Everywhere else, use `con-*`.** An element that paints its own background
already knows what it sits on, and can put its text on either side of it:

```typescript
className = 'bg-lum-6 text-lum-none' // knows its surface: says both
className = 'bg-lum-2 text-lum-7 border-lum-3'
className = 'text-con-mhigh border-con-low' // surface came from elsewhere
```

`con-*` only ever reads `--bg-l`, and only `bg-lum-*` sets it — so on a
self-backgrounded element `con-*` is measuring against a luminance you chose one
class earlier, and its direction is forced. `--con-flip` is the midpoint between
`lum-5` and `lum-6` (0.63 light, 0.455 dark): a surface at `lum-5` or lighter
takes dark text, `lum-6` or darker takes light.

- **Standard text** → `text-con-mhigh`; **muted** → `text-con-mid`, with
  `mlow`/`low` fainter; **emphasis** → `text-con-high`.
- **Borders** → `border-con-low`, `border-con-mlow` visible, `mid` strong.
- **Backgrounds** → `bg-lum-1` (page), `bg-lum-2` (raised fill), and up.

`border-b-con-*` does not exist — only `border-con-*` and `outline-con-*` — so a
bottom-only border stays on `border-b-lum-*`.

- **Cascade seeder + `lum` inside** (`hue-success chroma-mlow` at the top, `bg-lum-2` / `text-lum-9` below): the default shape for a colored component — declare its character once, speak luminance within. Portable: drop it under a different seeder (a danger context, a lang-themed subtree) and it takes on that character.
- **Explicit per-property axes** (`bg-lum-2 bg-chroma-mlow bg-hue-info`): one-off colored elements, or shared components used in many contexts where you want the color pinned rather than inherited.
- **Adjustments** (`hover:bg-lum-up-1`): hover/focus/active state changes.
- **Avoid `dark:` prefixes** — the scale and semantic tokens auto-flip. Reserve `dark:` for genuinely exceptional cases (e.g. a marketing page with custom gradients).
- **Avoid opacity tints** (`bg-primary/10`) — the `lum/chroma/hue` utilities don't support the `/opacity` modifier; use a luminance step (`bg-lum-2`) instead for consistent appearance across monitors.

### Properties with no utility

`tailwind-oklch` ships utilities for `bg-` `text-` `border-` `border-b-` `from-`
`to-` `decoration-` `shadow-` `accent-`, plus `con-` for `text`/`border`/
`outline`. There is **no** `ring-` `ring-offset-` `fill-` `stroke-` `divide-`
`via-` `placeholder-` `caret-`, and no `border-s-`/`border-e-`.

Those properties keep using semantic tokens. To keep them consistent with the
axes anyway, `globals.css` **derives the tokens from the ramp**:

```css
--border: oklch(var(--lum-3) var(--chroma-low) var(--hue-primary));
--ring: oklch(var(--lum-6) var(--chroma-max) var(--hue-primary));
```

Two things to know about these:

- They have **no `.dark` counterpart** and must not get one. `.dark` is set on
  `documentElement`, the same element as `:root`, so `var(--lum-3)` already
  resolves to the dark value there. Re-declaring them in `.dark` would win on
  source order and defeat the derivation.
- Chroma is **raw** here (no per-hue `--cscale-*`, no taper), same as the brand
  tokens. Keep the values low or they read more saturated than a utility at the
  same nominal stop. For reference a `chroma-max` _utility_ on `hue-primary`
  paints 0.25 × 0.86 = 0.215.
- Like any `:root` declaration reading `var(--hue-*)`, they resolve **once** at
  `:root` and so do not follow per-language hue in themed subtrees. That matches
  the static definitions they replaced. See `lang-theme.ts` for why, and use
  `getLangThemeCss()` (never a bare `--hue-primary`) when you do need a subtree
  to take a language's hue.

### Caveats

- **Never pair `dark:` with a `lum` class.** `lum` already auto-flips, so
  `dark:from-lum-5` is either redundant or fighting the system. A `dark:` variant
  on a color is a signal that something needs rethinking, not translating.
- **Portals break the cascade.** Base UI dialogs/popovers/dropdowns render into a portal, not under their trigger's DOM ancestor. Portal content must re-seed its own `hue`/`chroma`; never rely on inheritance across a portal boundary.
- **Shared components inherit their context.** That's the feature (it's how `button.tsx` shares its `solids`/`softs` classes across hue variants), but when pruning axes from a shared component, check every render context — keep axes explicit unless the context-sensitivity is wanted.

## Styling Conventions

- Use `cn()` function for conditional class name concatenation
- Use **"start" and "end"** instead of "left" and "right" for RTL support
- Use `@container` queries when relevant for component portability across different-sized containers
- **Use standard Tailwind classes** instead of arbitrary values when a standard class exists (e.g. use `z-50` not `z-[50]`, `z-100` not `z-[100]`)
- **Border radius**:
  - Interactive elements (links, buttons, inputs): `rounded-2xl`
  - Non-interactive elements (cards): `rounded`

## Base UI Data Attributes

This project uses `@base-ui/react` (NOT Radix) for low-level primitives. Base UI uses different data attributes than Radix:

- **Tabs**: Selected tab gets `data-active` (use `data-[active]:` in Tailwind). NOT `data-selected` or `data-state="active"`.
- **Select**: Similar pattern — check Base UI docs for the correct attribute names before styling.
- Always verify the actual data attribute names in `node_modules/@base-ui/react/esm/` type definition files when creating or modifying UI components.

## Component Styling Patterns

```typescript
// Links styled as buttons
<Link to="/path" className={buttonVariants({ variant: "default" })}>Go</Link>

// Links styled as links
<Link to="/path" className="s-link">Go</Link>

// Always use generic components for consistency
<Input /> <Textarea /> <Button />
```

## Buttons

Two props — **variant** (how loud) and **size** — with colour coming from a
`hue-*` class.

```typescript
<Button>Save</Button>
<Button variant="soft" size="sm">Show translations</Button>
<Button className="hue-danger">Delete</Button>
<Button variant="soft" className="hue-danger">Archive</Button>
```

A variant never names a colour — it states luminance and chroma and lets the hue
cascade in, so the same variant is red under `hue-danger` and green under
`hue-success`. There is no `hue` prop: colour is a `hue-*` class like anywhere
else in the system. Say nothing and it inherits from context, which is usually
what you want — a button inside a language-themed subtree takes that language's
colour on its own.

The same is true of `<Badge>` and `<Callout>`.

| Variant         | Role                                                                         | Example uses                                                                                              |
| --------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `default`       | **Primary action** — the thing you most want the user to do                  | Save, Submit, Create account, Confirm                                                                     |
| `neutral`       | **Paired counterpart** to default — cancel, go back, reset                   | Cancel, Go back, Reset, Dismiss                                                                           |
| `soft`          | **Optional initiation** — opens a flow the user may choose to start          | "Show translations", "Add to deck" (collapsible triggers, dialog openers that lead to a save/cancel pair) |
| `ghost`         | **Ambient/utility actions** — always available but not calling for attention | Icon buttons (edit, delete, share, copy), toolbar actions, nav toggles                                    |
| `dashed-w-full` | **Full-width "add new" affordance**                                          | "Add another translation" rows                                                                            |

Sizes are `default`, `sm`, `lg`, `icon`.

Styles live in `src/components/ui/button.css`, next to the component and
registered by an @import in `globals.css`. Tailwind inlines imports before
processing, so `@utility` works from there. Same for badge, sheet, item and
sidebar.

**Key principles:**

- **Default + neutral** is the standard button pair for forms and confirmation dialogs
- **`className="hue-danger"` + neutral** replaces default + neutral when the primary action is destructive
- **Soft** is for _optionally initiating_ a secondary flow (e.g. opening a dialog that itself has default/neutral buttons inside). It sits between ghost and default in visual weight
- **Ghost** is the workhorse for icon buttons and utility actions. Use it for anything that should be tappable but visually quiet
- **Ghost → soft for active state**: When a ghost button has a toggle/active state (e.g. bookmark saved, filter active), switch to `soft` to indicate the active state:
  ```typescript
  variant={isActive ? 'soft' : 'ghost'}
  ```

## View Transitions

Enable smooth page transitions with CSS view transitions:

```typescript
const style = { viewTransitionName: 'main-area' } as CSSProperties
```
