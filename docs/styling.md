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
		<span className="text-lum-9">…</span>
		<hr className="border-lum-4" />
	</div>
</div>
```

Because `:root` already seeds `hue-primary` + low chroma, a brand-colored surface often needs only `bg-lum-2`. Per-language dynamic theming keeps working automatically — it overrides the `--hue-*` variables everything resolves through.

Each property has the full trio; set only the axes that differ from what's inherited:

```typescript
className = 'bg-lum-2 bg-chroma-mlow bg-hue-primary' // all three explicit
className = 'text-lum-7 text-chroma-high text-hue-info'
className = 'border-lum-4 border-chroma-mlow border-hue-primary'
className = 'hover:bg-lum-3' // luminance only; chroma+hue inherited
```

Property prefixes: `bg-`, `text-`, `border-`, `border-b-`, `from-`, `to-` (gradient stops).

### Luminance scale (`lum`)

`{prop}-lum-{1–10 | none | max}`. Numbered stops ride a **front-loaded** curve (fine steps near the page, opening toward the foreground) and measure contrast with the page; the pure poles sit _outside_ the numbers. The scale auto-flips between light and dark mode:

| Value  | Light mode   | Dark mode    | Meaning                          |
| ------ | ------------ | ------------ | -------------------------------- |
| `none` | 1.00 (white) | 0.00 (black) | The page color — zero contrast   |
| `1`    | 0.92         | 0.185        | Lightest usable surface          |
| `2`    | 0.887        | 0.215        | Subtle surface / **card**        |
| `3`    | 0.831        | 0.268        | Raised surface / border          |
| `5`    | 0.676        | 0.412        | Mid                              |
| `7`    | 0.481        | 0.593        | Prominent                        |
| `9`    | 0.254        | 0.805        | Strong text                      |
| `10`   | 0.13         | 0.92         | Strong foreground (near the max) |
| `max`  | 0.00 (black) | 1.00 (white) | Full contrast                    |

Arbitrary luminance is a _direct_ L (`n/100`) and still auto-flips: `bg-lum-[93]` → L=0.93 in light, 0.07 in dark. (Note `lum-1…10` is a curved contrast ramp; `lum-[n]` is a raw L — two tools sharing a prefix.)

> **Reindex note (v0.7.0):** the old `lc` scale was renumbered. Surfaces shifted up a notch — the everyday `bg-lc-1` card is now `bg-lum-2`; `lc-base`→`lum-1`, `lc-fore`→`lum-10`, `lc-none/full`→`lum-none/max`. Because the ramp is formula-driven, retune any stop in `globals.css` (`--lum-2: …`) rather than hand-editing values.

### Chroma stops (`chroma`)

`{prop}-chroma-{low | mlow | mid | mhigh | high | max}`, or the seeder `chroma-{…}`. These are _base_ values, **scaled per hue** (each hue carries a `--cscale-*` multiplier so a stop looks about equally saturated across hues) and **tapered toward white** (chroma eases to 0 near the light pole). So the painted chroma is usually less than the raw base below:

| Name    | Base | Use for                            |
| ------- | ---- | ---------------------------------- |
| `low`   | 0.02 | Backgrounds, muted surfaces        |
| `mlow`  | 0.05 | Tinted backgrounds, subtle borders |
| `mid`   | 0.09 | Medium saturation                  |
| `mhigh` | 0.13 | Prominent accents                  |
| `high`  | 0.17 | Vivid colors                       |
| `max`   | 0.25 | Fullest color the hue can display  |

Arbitrary chroma is `n/100`: `border-chroma-[6]` → chroma 0.06.

### Available hues (`hue`)

`{prop}-hue-{…}` or the seeder `hue-{…}`. App palette (overridden in `globals.css`): `primary` (300), `accent` (175), `neutral` (270); plus `success` (145), `warning` (55), `danger` (15), `info` (220). `tailwind-oklch` has **no neutral hue** of its own (a neutral is the absence of chroma), so `globals.css` defines both `--hue-neutral` and its `--cscale-neutral`. Dynamic per-language hue is applied as inline `--hue-*` / axis-var style (`lang-theme.ts`), not a utility.

### Relative adjustments and self-solving contrast

Nudge off the _nearest absolute_ luminance without rewriting it — ideal for hover/active states (**`bg` and `text` only**; gradients/borders have no `up`/`down`):

```typescript
className = 'bg-lum-2 hover:bg-lum-up-1' // one step more contrast on hover
className = 'text-lum-8 group-hover:text-lum-down-1' // one step less
```

`{bg,text}-lum-up-{1–5}` / `-down-{1–5}`. Adjustments **don't compound**: a nudge always measures from the nearest ancestor's absolute `lum-N`, never from an already-nudged value.

To let an element pick a luminance that contrasts with **its own background** — light _or_ dark, no `dark:` — use `con-*` (`text-con-*`, `border-con-*`, `outline-con-*`), with words reading as _how much_ contrast (faint → stark): `low mlow mid mhigh high max`. `max` clamps to pure black/white.

```typescript
className = 'text-con-high' // stark against whatever surface this lands on
className = 'border-con-mlow' // a soft step off the surface
```

### Semantic color tokens

Defined in `globals.css`, these bridge the OKLCH scale with traditional Tailwind tokens. Being raw `oklch()`, they **bypass the per-hue scale/taper**, so brand chroma is pinned at `chroma-max` (0.25) directly:

| Token                                  | Definition                      | Notes                                                                 |
| -------------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `primary`                              | lum-6, chroma-max, hue-primary  | Auto-flips                                                            |
| `primary-foresoft`                     | lum-8, chroma-max, hue-primary  | Auto-flips; the "interactive purple" for links, soft buttons, borders |
| `primary-foreground`                   | Fixed L=0.93                    | Always near-white — for text ON primary surfaces only                 |
| `accent` / `accent-foresoft`           | lum-6/8, chroma-max, hue-accent | Auto-flips                                                            |
| `accent-foreground`                    | lum-10, chroma-mlow, hue-accent | Auto-flips; used as body text (language names)                        |
| `foreground`, `muted-foreground`, etc. | Static per-mode                 | Defined in `:root` and `.dark` blocks                                 |

### When to use what

- **Semantic tokens** (`text-primary`, `bg-card`, `border-border`): UI primitives that use the same color everywhere.
- **Cascade seeder + `lum` inside** (`hue-success chroma-mlow` at the top, `bg-lum-2` / `text-lum-9` below): the default shape for a colored component — declare its character once, speak luminance within. Portable: drop it under a different seeder (a danger context, a lang-themed subtree) and it takes on that character.
- **Explicit per-property axes** (`bg-lum-2 bg-chroma-mlow bg-hue-info`): one-off colored elements, or shared components used in many contexts where you want the color pinned rather than inherited.
- **Adjustments** (`hover:bg-lum-up-1`): hover/focus/active state changes.
- **Avoid `dark:` prefixes** — the scale and semantic tokens auto-flip. Reserve `dark:` for genuinely exceptional cases (e.g. a marketing page with custom gradients).
- **Avoid opacity tints** (`bg-primary/10`) — the `lum/chroma/hue` utilities don't support the `/opacity` modifier; use a luminance step (`bg-lum-2`) instead for consistent appearance across monitors.

### Caveats

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

## Button Variants

We use a deliberate set of button variants. Choose based on the action's role, not its visual weight:

| Variant            | Role                                                                         | Example uses                                                                                              |
| ------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `default`          | **Primary action** — the thing you most want the user to do                  | Save, Submit, Create account, Confirm                                                                     |
| `neutral`          | **Paired counterpart** to default or red — cancel, go back, reset            | Cancel, Go back, Reset, Dismiss                                                                           |
| `soft`             | **Optional initiation** — opens a flow the user may choose to start          | "Show translations", "Add to deck" (collapsible triggers, dialog openers that lead to a save/cancel pair) |
| `ghost`            | **Ambient/utility actions** — always available but not calling for attention | Icon buttons (edit, delete, share, copy), toolbar actions, nav toggles                                    |
| `red` / `red-soft` | **Destructive primary action** — paired with `neutral` for cancel            | Archive, Delete (confirmation dialogs)                                                                    |
| `badge-outline`    | **Tag/badge-shaped toggles**                                                 | Filter chips, tag pickers                                                                                 |
| `dashed-w-full`    | **Full-width "add new" affordance**                                          | "Add another translation" rows                                                                            |

**Key principles:**

- **Default + neutral** is the standard button pair for forms and confirmation dialogs
- **Red + neutral** replaces default + neutral when the primary action is destructive
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
