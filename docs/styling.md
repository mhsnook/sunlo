# Styling

## OKLCH Color System

This project uses a **vendored, single-axis OKLCH color system** — `src/styles/oklch.css` (forked from `mhsnook/tailwind-oklch@112de8e`, MIT; no npm dependency, no JS plugin). Every color is composed from three independent axes: **luminance contrast** (`lc`), **chroma** (`chroma`), and **hue** (`hue`). The system auto-flips between light and dark mode, so you almost never write `dark:`.

The guiding idea: **each class states one fact about one axis.** Hue and chroma flow _down the cascade_ from container seeders, so most elements only ever say what their luminance is.

### Say each axis once, as low in the tree as it changes

There are two kinds of class:

**Cascade seeders** set an axis for _everything below them_ and apply no property themselves. Put them near a component's root:

```
hue-primary · hue-danger · hue-success · …     seeds hue for descendants
chroma-mlo · chroma-hi · …                     seeds chroma for descendants
```

**Per-property setters** apply exactly one CSS property from one axis. Luminance is the one you set constantly; chroma and hue inherit from a seeder (or the `:root` default) unless set explicitly:

```typescript
// A "generally green, generally lowkey" component: seed once at the top…
;<div className="hue-success chroma-mlo">
	{/* …then speak luminance inside */}
	<div className="bg-lc-1">
		<span className="text-lc-8">…</span>
		<hr className="border-lc-3" />
	</div>
</div>
```

Because `:root` already seeds `hue-primary` + low chroma, a brand-colored surface often needs only `bg-lc-1`. Per-language dynamic theming keeps working automatically — it overrides the `--hue-*` variables everything resolves through.

Each property has the full trio; set only the axes that differ from what's inherited:

```typescript
className = 'bg-lc-1 bg-chroma-mlo bg-hue-primary' // all three explicit
className = 'text-lc-6 text-chroma-hi text-hue-info'
className = 'border-lc-3 border-chroma-mlo border-hue-primary'
className = 'hover:bg-lc-2' // luminance only; chroma+hue inherited
```

Property prefixes: `bg-`, `text-`, `border-`, `border-b-`, `from-`, `to-` (gradient stops).

### Luminance contrast scale (`lc`)

`{prop}-lc-{0–10 | base | fore | none | full}`. The scale auto-flips between light and dark mode:

| Value         | Light mode        | Dark mode         | Meaning          |
| ------------- | ----------------- | ----------------- | ---------------- |
| `0` / `base`  | 0.95 (near white) | 0.12 (near black) | Blends with page |
| `1`           | 0.91              | 0.20              | Subtle tint      |
| `5`           | 0.63              | 0.52              | Mid-contrast     |
| `7`           | 0.44              | 0.68              | Prominent        |
| `10` / `fore` | 0.15 (near black) | 0.92 (near white) | Maximum contrast |
| `none`        | 1.0 (white)       | 0.0 (black)       | Beyond base      |
| `full`        | 0.0 (black)       | 1.0 (white)       | Beyond fore      |

Arbitrary luminance auto-flips too: `bg-lc-[93]` → L=0.93 in light, 0.07 in dark.

### Chroma stops (`chroma`)

`{prop}-chroma-{lo | mlo | mid | mhi | hi}`, or the seeder `chroma-{…}`:

| Name  | Value | Use for                            |
| ----- | ----- | ---------------------------------- |
| `lo`  | 0.02  | Backgrounds, muted surfaces        |
| `mlo` | 0.06  | Tinted backgrounds, subtle borders |
| `mid` | 0.12  | Medium saturation                  |
| `mhi` | 0.18  | Prominent accents                  |
| `hi`  | 0.25  | Vivid, saturated colors            |

Arbitrary chroma is `n/100`: `border-chroma-[6]` → chroma 0.06.

### Available hues (`hue`)

`{prop}-hue-{…}` or the seeder `hue-{…}`. App palette (overridden in `globals.css`): `primary` (300), `accent` (175), `neutral` (270); plus `success` (145), `warning` (55), `danger` (15), `info` (220). Dynamic per-language hue is applied as an inline `--hue-*` style variable, not a utility.

### Relative adjustments

Nudge off the _inherited/current_ luminance without rewriting it — ideal for hover/active states:

```typescript
className = 'bg-lc-1 hover:bg-lc-up-1' // one step more contrast on hover
className = 'text-lc-7 group-hover:text-lc-down-1' // one step less
```

`{prop}-lc-up-{1|2|3}` / `{prop}-lc-down-{1|2|3}`. Adjustments **don't compound**: a grandchild's `lc-up-1` nudges from the nearest ancestor's _set_ luminance, not from a parent's already-nudged value.

### Semantic color tokens

Defined in `globals.css`, these bridge the OKLCH scale with traditional Tailwind tokens:

| Token                                  | Definition                | Notes                                                                 |
| -------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `primary`                              | L=5, C=hi, hue-primary    | Auto-flips                                                            |
| `primary-foresoft`                     | L=7, C=hi, hue-primary    | Auto-flips; the "interactive purple" for links, soft buttons, borders |
| `primary-foreground`                   | Fixed L=0.93              | Always near-white — for text ON primary surfaces only                 |
| `accent` / `accent-foresoft`           | L=5/7, C=hi, hue-accent   | Auto-flips                                                            |
| `accent-foreground`                    | L=fore, C=mlo, hue-accent | Auto-flips; used as body text (language names)                        |
| `foreground`, `muted-foreground`, etc. | Static per-mode           | Defined in `:root` and `.dark` blocks                                 |

### When to use what

- **Semantic tokens** (`text-primary`, `bg-card`, `border-border`): UI primitives that use the same color everywhere.
- **Cascade seeder + `lc` inside** (`hue-success chroma-mlo` at the top, `bg-lc-1` / `text-lc-8` below): the default shape for a colored component — declare its character once, speak luminance within. Portable: drop it under a different seeder (a danger context, a lang-themed subtree) and it takes on that character.
- **Explicit per-property axes** (`bg-lc-1 bg-chroma-mlo bg-hue-info`): one-off colored elements, or shared components used in many contexts where you want the color pinned rather than inherited.
- **Adjustments** (`hover:bg-lc-up-1`): hover/focus/active state changes.
- **Avoid `dark:` prefixes** — the scale and semantic tokens auto-flip. Reserve `dark:` for genuinely exceptional cases (e.g. a marketing page with custom gradients).
- **Avoid opacity tints** (`bg-primary/10`) — the `lc/chroma/hue` utilities don't support the `/opacity` modifier; use a luminance step (`bg-lc-1`) instead for consistent appearance across monitors.

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
