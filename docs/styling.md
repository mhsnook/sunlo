# Styling

## tailwind-oklch Color System

This project uses the **tailwind-oklch** plugin for composable, auto-flipping OKLCH colors. Every color is built from three axes: **luminance contrast** (L), **chroma** (C), and **hue** (H).

### Shorthand syntax (preferred when setting all three axes)

```
{prop}-{L}-{C}-{H}
```

Examples:

```typescript
// Background: luminance 1, chroma mlo, hue primary
className = 'bg-1-mlo-primary'

// Text: luminance 6, chroma hi, hue info
className = 'text-6-hi-info'

// Border: luminance 4, chroma mid, hue danger
className = 'border-4-mid-danger'

// Works with variants:
className = 'hover:bg-2-mlo-info'
```

**Always use the shorthand** when setting all three axes. Only use decomposed form (`bg-lc-* bg-c-* bg-h-*`) when overriding a single axis or using adjustment utilities.

### Luminance contrast scale (L)

The 0–10 scale auto-flips between light and dark mode:

| Value         | Light mode        | Dark mode         | Meaning          |
| ------------- | ----------------- | ----------------- | ---------------- |
| `0` / `base`  | 0.95 (near white) | 0.12 (near black) | Blends with page |
| `1`           | 0.87              | 0.20              | Subtle tint      |
| `5`           | 0.55              | 0.52              | Mid-contrast     |
| `7`           | 0.39              | 0.68              | Prominent        |
| `10` / `fore` | 0.15 (near black) | 0.92 (near white) | Maximum contrast |
| `none`        | 1.0 (white)       | 0.0 (black)       | Beyond base      |
| `full`        | 0.0 (black)       | 1.0 (white)       | Beyond fore      |

### Chroma stops (C)

| Name  | Value | Use for                            |
| ----- | ----- | ---------------------------------- |
| `lo`  | 0.02  | Backgrounds, muted surfaces        |
| `mlo` | 0.06  | Tinted backgrounds, subtle borders |
| `mid` | 0.12  | Medium saturation                  |
| `mhi` | 0.18  | Prominent accents                  |
| `hi`  | 0.25  | Vivid, saturated colors            |

### Available hues (H)

`primary` (300), `accent` (175), `neutral` (270), `success` (145), `warning` (55), `danger` (15), `info` (220)

### Adjustment utilities (single-axis overrides)

Use these when you need to nudge ONE axis, inheriting the others from a parent or shorthand:

```typescript
// Adjust luminance: more contrast (+) or less contrast (-)
className = 'bg-1-mlo-primary group-hover:bg-lc-up-1'

// Override just the hue on a child element
className = 'bg-h-accent'

// Override just the chroma
className = 'text-c-hi'
```

### Semantic color tokens

Defined in `globals.css`, these bridge the tailwind-oklch scale with traditional Tailwind tokens:

| Token                                  | Definition                | Notes                                                                 |
| -------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `primary`                              | L=5, C=hi, hue-primary    | Auto-flips via plugin                                                 |
| `primary-foresoft`                     | L=7, C=hi, hue-primary    | Auto-flips; the "interactive purple" for links, soft buttons, borders |
| `primary-foreground`                   | Fixed L=0.93              | Always near-white — for text ON primary surfaces only                 |
| `accent` / `accent-foresoft`           | L=5/7, C=hi, hue-accent   | Auto-flips                                                            |
| `accent-foreground`                    | L=fore, C=mlo, hue-accent | Auto-flips; used as body text (language names)                        |
| `foreground`, `muted-foreground`, etc. | Static per-mode           | Defined in `:root` and `.dark` blocks                                 |

### When to use what

- **Semantic tokens** (`text-primary`, `bg-card`, `border-border`): For UI primitives that use the same color everywhere
- **Shorthand** (`bg-1-mlo-info`): For one-off colored elements — icon backgrounds, tinted surfaces, status indicators
- **Decomposed** (`bg-lc-up-1`, `text-c-hi`): For hover/focus adjustments or overriding one axis of an inherited color
- **Avoid `dark:` prefixes** — the oklch scale and semantic tokens auto-flip. Only use `dark:` for truly exceptional cases (e.g. marketing page with custom gradient backgrounds)
- **Avoid opacity-based tints** (`bg-primary/10`) — use luminance steps instead (`bg-1-mlo-primary`) for consistent appearance across monitors

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
