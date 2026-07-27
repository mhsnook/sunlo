# OKLCH Colour Migration

Notes from converting Sunlo off shadcn semantic tokens onto `tailwind-oklch`
(~1,100 classes, 165 files). Written after the fact, so the ordering reflects
what should have happened rather than what did.

Read alongside `docs/styling.md`, which describes the system as it stands. This
file is about the **conversion**: what to do, in what order, and which traps are
silent.

---

## The one rule that matters

**Don't translate class-to-class. Decide what the element _is_, then name it.**

Every wrong turn in this migration came from mapping an old class to whichever
new class had the nearest numeric value. That bakes the old system's accidents
into the new system's vocabulary, and it is worse than useless because the
result looks plausible.

Concretely, the failure mode:

> `text-muted-foreground` is L 0.55, and `con-mhigh` is the closest stop, so
> muted text becomes `text-con-mhigh`.

That is backwards. `mhigh` should mean "standard text" because that's what the
word means. Muted text is `mid` — and if `mid` then looks wrong, **the scale is
mis-tuned, not the name**. Fix `--con-mid` in `globals.css`, once, rather than
picking a louder name at 500 call sites.

The scale is the knob. The names are the API.

---

## Order of operations

1. **Read the library's source.** Not the README — `node_modules/tailwind-oklch/index.css`.
   Enumerate what actually exists before planning anything:

   ```bash
   grep -oE '@utility [a-z0-9-]+\*?' node_modules/tailwind-oklch/index.css | sort -u
   ```

   Half the plan depends on which property × axis combinations exist. There is
   no `ring-*`, `fill-*`, `stroke-*`, `divide-*`, `via-*`, and no
   `border-b-con-*` even though `border-b-lum-*` exists.

2. **Fix `cn()` before touching a single class.** See "tailwind-merge" below.
   Get this wrong and every later change is unreliable in a way that looks like
   a rendering bug.

3. **Surfaces and borders first** — `bg-*`, `border-*`. Mechanical, low risk.

4. **Text second**, deciding the `con` vs `lum` question (below).

5. **Brand/state colour last**, splitting hue out of variants.

6. **Then the leftovers**: rings, chart ink, gradients. These are where the
   library has gaps, so they need real decisions, not codemods.

Pilot every codemod on 3 files and read the diff before the full run. This
caught three separate bugs that would otherwise have shipped across 165 files.

---

## Silent traps, all verified

These share a shape: **utility A writes a var that utility B reads, or fails to
write one B needs.** They fail with a plausible-looking result, never an error.

### tailwind-merge eats two of the three axes

`bg-lum-2` and `bg-chroma-mlow` both parse as the `bg-color` group, so stock
`twMerge` keeps only the last:

```js
twMerge('bg-lum-5 bg-chroma-max bg-hue-danger') // -> 'bg-hue-danger'
```

Only bites classes that flow through `cn()`, so `cva` primitives break while
plain `className="…"` string literals are fine — which makes it look like a
component bug. Fix with `extendTailwindMerge`, registering each (property ×
axis) as its own group. Ours is in `src/lib/utils.ts`; verify with a real
`cn()` call, not raw `twMerge`.

### `text-chroma-*` / `text-hue-*` beat `text-con-*`

Both emit `color` at `var(--tx-l)`. `con-*` computes from `--bg-l` and **never
sets `--tx-l`**. Equal specificity, chroma sorts later, so it wins and paints at
the `:root` default.

```html
<span class="text-con-mid text-chroma-max">
	<!-- renders at lum-9, not con-mid -->
	<span class="text-con-mid chroma-max"> <!-- correct --></span></span
>
```

**Bare seeders never paint; per-property setters always do.** That is the whole
distinction, and it isn't in the library docs. When you want an axis _plus_
`con-*`, reach for the seeder.

### `--con-off` is shared by text, border and outline

All three `con` utilities declare `--con-off` and `--con-dir`. An element with
`text-con-mhigh border-con-low` resolves **one** offset for both properties, and
text sorts later, so the border silently takes the text's contrast. Don't put
text and border `con` on the same element; use an absolute `border-lum-*`.

### Gradients don't set `--bg-l`

`from-lum-*` writes `--gf-l`. So `text-con-high` on a gradient measures the
_page_ and picks the wrong direction. Use `text-lum-none` — the pure pole, which
auto-flips and needs no `--bg-l`. Same answer for text on any token-coloured
surface.

### A runtime `--hue-primary` does nothing below `:root`

The axis vars are declared at `:root` as `--bg-h: var(--hue-primary)`, so they
resolve **once, there**. Overriding `--hue-primary` on a subtree is ignored —
you must re-declare all the `--*-h` axis vars. The `hue-*` _utility_ does this
correctly; inline styles for runtime-computed hues do not.

Cost us three separate bugs (language badges, avatars, a hue picker) made
worse by the fact that setting it on `documentElement` **does** work, so
page-level theming looked fine while every nested use was broken. Use a shared
helper (`getHueThemeCss`) and never a bare `--hue-primary`.

---

## Judgment calls, and how they resolved

**`con-*` or `lum-*`?** If an element sets its own `bg-lum-*`, state its text and
border with `lum-*` too. It knows its surface, and `con-*`'s direction would be
forced by a luminance you chose one class earlier — on a light badge every stop
from `con-low` to `con-high` lands dark, so you can't invert even when you want
to. Everywhere else, `con-*`, because the surface came from somewhere else.

**Variants never name a colour.** A variant says how _loud_; a `hue-*` class says
what colour. `red` and `red-soft` collapse into `default`/`soft` under
`hue-danger`. This applies to every component, not just buttons.

**Don't wrap a global axis in a per-component prop.** We briefly added a `hue`
prop to Button/Badge/Callout and removed it. `variant`/`size` earn props because
`btn-variant-soft` means nothing on a `<div>`. Hue works on any element, so a
prop is a second way to say the same thing. `className="hue-danger"`.

**Hoist hue to the component root.** An icon inside an info card doesn't need
`hue-info` — it's inside the info card. Restating an axis at three depths is the
main source of noise, and deleting the restatements is where the system starts
to feel good.

**Not everything is a ramp position.** A card is white paper on a tinted page:
pure white in light, _darker_ than the page in dark, receding toward the pole
both ways, matching no `lum-N`. Keep those as semantic tokens. Same for
translucency — the axes cannot express it, so confine it to one documented
utility rather than spreading `bg-white/10` around.

**Accessibility affordances belong in `globals.css`, not components.** Focus
rings became one `:focus-visible` rule; 53 per-component restatements deleted.
`outline-con-*` is ideal here because it measures the element's own surface, so
one rule is correct on a page, a card, or a coloured button.

---

## Useful mechanics

**Co-locate component CSS.** `@utility` works from a file next to the component,
imported from `globals.css` — Tailwind inlines imports before processing, and
tree-shaking is unchanged. Beats a growing `globals.css` that nobody can map
back to a component.

**Class names must be literal.** Tailwind scans source strings, so
`` `btn-size-${size}` `` never generates. Use a lookup record — which also keeps
the keys type-checked.

**`@apply` is a linter.** It rejects classes that don't exist, which is how we
found `text-md` (not a real class — silently ignored in `className` for who
knows how long) and marker classes like `group/item` and `peer/menu-button`,
which must stay on the element.

**`--lum-max` makes arbitrary values auto-flip.** `oklch(var(--lum-max) 0 0)` is
black in light and white in dark, replacing a `dark:`-variant pair.

**`dark:` on a `lum` class is always wrong.** The ramp already flips. Guard
codemods against it and treat existing ones as a signal to rethink, not
translate.

---

## Verifying

Typecheck and lint won't catch colour mistakes. What actually worked:

```bash
# does the class exist at all?
npx vite build && grep -oE '\.the-class\{[^}]*\}' dist/assets/*.css

# what does an element really resolve to? compute it, don't eyeball the class
# L = bg_l ± con_off, direction by --con-flip (0.63 light / 0.455 dark)

# what still references a token?
grep -rEn "(bg|text|border|from|to|ring|outline|fill|stroke)-TOKEN\b" src

# is cn() preserving axes? use the real cn, via a vitest probe — not raw twMerge
```

Read compiled CSS whenever behaviour is in question. Nearly every bug here was
found by reading the emitted rule and noticing two declarations of one property.

**And it does not replace looking at the screen.** Every visual regression in
this migration was caught by a human opening the app, never by a check. Compute
what you can, then say plainly what you have not seen.

---

## Writing about it afterwards

Keep the docs and comments to the load-bearing fact. Don't explain how the
cascade works at the site of a specific change, don't argue against readings
nobody proposed, and don't restate that a subtree overrides its ancestors — the
reader knows CSS. `The root uses chroma-mid, so unless you set otherwise all
your colours have this middle saturation` is the whole note.
