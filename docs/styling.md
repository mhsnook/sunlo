# Styling

## Colors

Colors are ordinary Tailwind: a palette name and a shade number.

```typescript
<div className="bg-primary-100 border-primary-200">
	<span className="text-primary-800">…</span>
	<button className="bg-primary-700 text-white hover:bg-primary-800">Save</button>
</div>
```

Seven **semantic palettes** are available — `primary`, `accent`, `neutral`, `success`, `warning`, `danger`, `info` — each with the standard 50–950 shades. Every one is an alias for a stock Tailwind palette, so `bg-danger-700` is `bg-red-700`: same value, same shade number. The aliases live in `src/styles/theme.css`.

| Semantic  | Stock palette | Semantic  | Stock palette |
| --------- | ------------- | --------- | ------------- |
| `primary` | `purple`      | `success` | `green`       |
| `accent`  | `teal`        | `warning` | `amber`       |
| `neutral` | `slate`       | `danger`  | `red`         |
|           |               | `info`    | `blue`        |

Two things are added on top, and nothing else.

### 1. The shade scale flips in dark mode

50 and 950 swap, 100 and 900 swap, and so on down to 500, which mirrors itself. A shade number therefore means _how much contrast this has against the page_, not a fixed lightness:

| Shade | Light mode     | Dark mode      | Use for                 |
| ----- | -------------- | -------------- | ----------------------- |
| `50`  | near-white     | near-black     | Blends with the page    |
| `100` | very pale tint | very dark tint | Subtle surface          |
| `500` | mid            | mid            | Solid fills, dots       |
| `700` | strong         | strong         | Buttons, prominent text |
| `950` | near-black     | near-white     | Maximum-contrast text   |

So `bg-primary-100 text-primary-800` reads correctly in both modes and needs no `dark:` variant. **Do not write `dark:` in app code.**

Stock Tailwind palettes (`bg-purple-600`, `text-slate-300`) are untouched and do **not** flip. The marketing pages in `src/routes/-homepage/` use them directly with hand-written `dark:` variants, which is why the flip is scoped to the semantic names.

### 2. `primary` and `accent` can be re-pointed

Both resolve through `--p-*` and `--a-*` variables, so setting those on any element re-themes everything inside it — no per-element classes, no re-declaring anything. That is how per-language theming works:

```typescript
import { getLangThemeCss } from '@/lib/lang-theme'

// every bg-primary-*, text-accent-*, border-primary-* inside follows
<div style={getLangThemeCss(lang)}>…</div>
```

The dark-mode flip composes on top, because the flip is written against `--p-*`/`--a-*` rather than against a fixed palette. A re-pointed subtree still flips correctly.

`src/lib/lang-theme.ts` owns the palette assignment: `LANG_PALETTES` maps language stops to stock palettes, `AVATAR_PALETTES` does the same for placeholder avatars, and `getPaletteCss()` / `setPaletteOn()` apply one.

Because those `var(--color-rose-500)` references are built at runtime, `globals.css` imports Tailwind with `theme(static)` so no palette gets tree-shaken out.

### Semantic surface tokens

The ShadCN token set (`bg-card`, `bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`) is still there and still preferred for UI primitives that use the same color everywhere. All of them are defined from the palettes in `globals.css`, so they flip too.

One exception worth knowing: `--color-primary-foreground` reads from `--p-50` rather than `--color-primary-50`, so it stays at the pale end in both modes. It is text that sits ON a saturated primary surface, which is mid-dark either way.

### When to use what

- **Semantic tokens** (`bg-card`, `text-primary`): UI primitives with one color everywhere.
- **Semantic palette + shade** (`bg-success-100`, `text-success-800`): the default for anything colored.
- **Stock palettes** (`bg-purple-600`): marketing pages only, where the color is a deliberate one-off and you are willing to write `dark:` yourself.
- **Opacity modifiers** (`bg-primary-600/50`) work normally.

### Caveats

- **Portals do not break anything anymore.** A Base UI dialog rendered into a portal sits outside its trigger's DOM ancestor, so it will not pick up a re-pointed `primary` from that subtree. It still gets the correct default palette and the correct dark-mode flip.
- **`neutral` shadows Tailwind's own `neutral`.** `bg-neutral-100` is slate-tinted and flips. Reach for `gray`, `zinc`, or `stone` if you want a true stock grey.

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
