# Styling

## Colors

Colors are stock Tailwind — a palette name and a shade number:

```typescript
<div className="bg-primary-100 border-primary-200">
	<span className="text-primary-800">…</span>
	<button className="bg-primary-700 text-primary-50 hover:bg-primary-800">Save</button>
</div>
```

Alongside Tailwind's own palettes there are seven semantic ones, each an alias for a stock palette at the same shade numbers — `bg-danger-700` _is_ `bg-red-700`. Aliases live in `src/styles/theme.css`.

| Semantic  | Stock    | Semantic  | Stock   |
| --------- | -------- | --------- | ------- |
| `primary` | `purple` | `success` | `green` |
| `accent`  | `teal`   | `warning` | `amber` |
| `neutral` | `slate`  | `danger`  | `red`   |
|           |          | `info`    | `blue`  |

Plus an achromatic pair, `paper` and `ink` — a surface and a mark on it, both following the mode, which `white` and `black` do not.

The ShadCN surface tokens (`bg-card`, `text-muted-foreground`, `border-border`) are built from all of these in `globals.css`. Prefer them for UI primitives that use one color everywhere.

Two behaviours are worth knowing.

### Dark mode flips the shade scale

50 and 950 swap, 100 and 900 swap, down to 500 which mirrors itself. A shade number means _how much contrast against the page_, not a fixed lightness — so `bg-primary-100` is a subtle surface and `text-primary-800` is strong text in both modes. **Do not write `dark:` in app code.**

One consequence to design around: a solid fill inverts polarity. `bg-primary-700` is dark in light mode and pale in dark mode, so `text-white` on it is unreadable half the time. **Use `text-paper` on any filled surface** — it is the one foreground that works on every palette, including a re-pointed one.

`paper` and `ink` are also the answer where a surface has to sit _above_ the page in both modes. "Above" means lighter either way, which no flipping shade can express relative to a flipping page — that is why `--card` is `paper` rather than `neutral-50`.

Tailwind's own palettes do **not** flip. `bg-purple-600` is the same purple in both modes, which is why the marketing pages in `src/routes/-homepage/` can use them with hand-written `dark:` variants.

### `primary` and `accent` are re-pointable

Both resolve through `--p-*` and `--a-*`, so setting those on an element re-themes its whole subtree — the deck tiles and language badges on the learn index each carry their own language's palette. That is how per-language theming works:

```typescript
import { getLangThemeCss } from '@/lib/lang-theme'

<div style={getLangThemeCss(lang)}>…</div>
```

`src/lib/lang-theme.ts` owns which palette a language or avatar gets.

Re-pointing and the flip compose, and getting both at once is the reason these two palettes are declared differently from the rest — `theme.css` explains it. The short version: a custom property resolves where it is _declared_, so anything resolved at `:root` cannot be re-pointed further down. Primary and accent are therefore inlined into the utility class as `light-dark()`, which puts both branches on the element itself. If you add a palette that needs re-pointing, copy that shape; a plain alias will silently ignore the override.

Note that `neutral` shadows Tailwind's own `neutral`: `bg-neutral-100` is slate-tinted and flips. Use `gray`, `zinc`, or `stone` for a true stock grey.

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
