# React to SolidJS feasibility: Sunlo

Built as it stands, Sunlo ships about **2.93 MB of JavaScript (959 KB
gzipped)**, of which **1,090 KB (320 KB gzipped) is the always-loaded main
chunk**. Rebuilt in SolidJS 2.0 — taking the default replacement for every
dependency — the projection is roughly **2.64 MB / ~865 KB gzipped** total and
**~970 KB / ~282 KB gzipped** for the main chunk. That is about **290 KB raw /
95 KB gzipped off the total bundle, and 120 KB raw / 38 KB gzipped off the main
chunk**. Almost the entire main-chunk saving is one swap: React's ~135 KB DOM
runtime collapsing to ~20 KB of `solid-js`.

Note the proportion before reading on: the React runtime is only about **13% of
that 1,090 KB main chunk**. The rest is the TanStack DB stack, the Supabase
SDK, Base UI, `zod`, and app code — all of which is either kept untouched or
swapped like-for-like. The migration's bundle effect is real but modest against
a foundation this heavy.

This is information for a migration decision, not a recommendation. It does not
argue for or against the move and it does not estimate effort in time.

_Assessment baseline: SolidJS 2.0. Built and measured 2026-05-21 on branch
`claude/react-solidjs-migration-tool` (`pnpm build`, Vite 8, Supabase
credentials present — see Method note in §1)._

## 1. Bundle projection

### Measured today

|                                     | Raw      | Gzip   |
| ----------------------------------- | -------- | ------ |
| Total JS (248 chunks)               | 2.93 MB  | 959 KB |
| Main / entry chunk (`index-*.js`)   | 1,090 KB | 320 KB |
| CSS (unaffected by the migration)   | 182 KB   | 26 KB  |
| `chart-*.js` (recharts, lazy)       | 323 KB   | 97 KB  |
| `my-markdown-*.js` (markdown, lazy) | 116 KB   | 35 KB  |

### Where the JavaScript goes today

Attributed from the build's module treemap (gzipped, approximate — the treemap
measures pre-minification, scaled here to the real totals):

| Slice                                                                         | ≈ Gzip  | Migration fate                                     |
| ----------------------------------------------------------------------------- | ------- | -------------------------------------------------- |
| App source (~275 components)                                                  | ~305 KB | rewritten; size roughly held (see §5)              |
| `recharts` + `d3`                                                             | ~115 KB | **rebuilt** on a different charting engine         |
| Other deps (`sonner`, `lucide`, `vaul`, `immer`, `qrcode`, `tailwind-merge`…) | ~130 KB | mostly kept; a few small swaps                     |
| `@tanstack/*` — router, query, db, form                                       | ~117 KB | **mostly kept** — the cores are framework-agnostic |
| Base UI (`@base-ui/react`, `@floating-ui`)                                    | ~120 KB | swapped to Kobalte — size roughly neutral          |
| React runtime (`react-dom`, `react`, `scheduler`)                             | ~48 KB  | **collapses** to `solid-js`                        |
| `@supabase/*` SDK                                                             | ~43 KB  | **kept** — framework-agnostic                      |
| Markdown ecosystem (`react-markdown` + remark/micromark)                      | ~32 KB  | **kept** — only the thin renderer swaps            |

The single most useful observation: a large share of the bundle — the
`@tanstack` cores, the `@supabase` SDK, the markdown ecosystem, `zod`, styling
— is framework-agnostic and **does not move at all**. The migration's bundle
effect is concentrated in two places: the React runtime and the chart engine.

### The projection — what actually moves

| Change                                             | ≈ Gzip delta | Lands in                      |
| -------------------------------------------------- | ------------ | ----------------------------- |
| `react` + `react-dom` + `scheduler` → `solid-js`   | **−36 KB**   | main chunk                    |
| `zustand` → Solid's built-in `createStore`         | −2 KB        | main chunk                    |
| `recharts` → `solid-chartjs` (or ECharts)          | **≈ −53 KB** | lazy (stats / charts routes)  |
| `vaul`, `qrcode.react`, misc small swaps           | ≈ −5 KB      | mixed                         |
| `@base-ui/react` → Kobalte                         | **≈ 0 (±)**  | mixed — see uncertainty below |
| `@tanstack` React adapters → Solid adapters        | ≈ 0          | mixed — shared cores          |
| `@supabase` SDK, markdown ecosystem, all kept deps | 0            | —                             |

**Projected result:** total JS ≈ 2.64 MB raw / ~865 KB gzip; main chunk
≈ 970 KB raw / ~282 KB gzip.

### Method and uncertainty

- **Measured** (firm): the current bundle, from an actual `pnpm build` with
  Supabase credentials present in the environment.
- **Build-environment note:** `src/lib/supabase-client.ts` throws if
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset. A build _without_
  those vars constant-folds that guard to `if (true) throw`, makes the
  `createClient()` call dead code, and lets the bundler tree-shake out the
  entire `@supabase/*` SDK — ~640 KB, vanished. The baseline above is the
  credentialed build (the one your CI and deploy produce). Measure a
  representative build or this number is wrong by a third.
- **Firm projection:** the React-runtime collapse. `react-dom` + `react` +
  `scheduler` is ~135 KB raw / ~44 KB gzip of well-characterized code;
  `solid-js` is ~20 KB raw / ~7.5 KB gzip. This delta is near-certain and is
  the bulk of the main-chunk win.
- **Soft projection:** the charting delta depends on the Solid charting library
  chosen — `solid-chartjs` (Chart.js) lands around ~190 KB raw; a lighter
  library saves more, ECharts less.
- **The one real unknown:** Base UI → Kobalte. Base UI is ~120 KB gzip of this
  bundle. Kobalte is a comparable accessible-primitives library; whether it
  lands smaller, similar, or larger was not measured. This could swing the
  total by roughly ±40 KB.
- **Not counted — upside:** the ~960 KB raw of app code is held flat in the
  projection. Solid compiles components to compact DOM operations rather than
  `React.createElement` trees, and the React Compiler's injected memoization —
  woven through all ~275 components — disappears. App code would likely shrink,
  possibly materially. Not banked, because it cannot be measured without doing
  the port.

## 2. Scope & inventory

Sunlo is a **single-page app** — Vite 8 + React 19, client-rendered, no SSR or
RSC. It is in scope. A root `middleware.ts` is deployment-edge logic, outside
the React tree and outside the migration surface.

| Fact                      | Value                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| Framework                 | React 19.2.3 / react-dom 19.2.3                                      |
| Build                     | Vite 8, `@vitejs/plugin-react` 6                                     |
| React Compiler            | **Enabled** — `babel-plugin-react-compiler` 1.0.0 via a Babel preset |
| Component files (`.tsx`)  | ~275                                                                 |
| Custom hooks              | ~12                                                                  |
| Feature modules           | 9 (`src/features/*`)                                                 |
| Data collections          | ~14, across 9 `collections.ts` files                                 |
| `useLiveQuery` call sites | ~110                                                                 |
| UI primitive wrappers     | 38 (`src/components/ui/`)                                            |
| Forms                     | ~15, on TanStack Form                                                |
| Realtime subscriptions    | 2 hooks                                                              |

React-specific escape hatches are **rare** — `forwardRef` appears once
(`components/ui/chart.tsx`), `useImperativeHandle` zero times, `createPortal`
zero, `useReducer` zero, `useSyncExternalStore` twice (`src/lib/lang-theme.ts`).
The app is built on hooks and modern patterns, not on imperative React
internals.

## 3. Dependency landscape

### Keep — framework-agnostic, zero change

`zod`, `dayjs`, `class-variance-authority`, `clsx`, `tailwind-merge`,
`tailwindcss` and every Tailwind plugin, `tailwind-oklch`, `tailwindcss-animate`,
`ts-fsrs`, the Fontsource fonts — the `@tanstack` cores, the entire
`remark`/`micromark` markdown ecosystem, and, notably, **the whole
`@supabase/*` SDK** (`supabase-js`, `auth-js`, `realtime-js`, `postgrest-js`,
`storage-js`, `phoenix` — together ~330 KB of the bundle, one of its largest
single blocks). All of this carries over untouched. The `tailwind-oklch` color
system and the `cn()` helper carry over too. Vite itself stays.

This is a large fraction of the dependency list, and a large fraction of the
bundle — a meaningful point in the migration's favor.

### Swap — clear leader, one obvious target

| Current                                               | Target                   | Note                                                                                                                 |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `react` + `react-dom`                                 | `solid-js`               | The runtime collapse — the headline saving.                                                                          |
| `@vitejs/plugin-react`, `babel-plugin-react-compiler` | `vite-plugin-solid`      | The Babel + React-Compiler wiring is **deleted**, not ported (§6).                                                   |
| `@tanstack/react-query`                               | `@tanstack/solid-query`  | Same monorepo; near drop-in.                                                                                         |
| `@tanstack/react-router` (+ router-plugin)            | `@tanstack/solid-router` | Same loader / beforeLoad / context concepts.                                                                         |
| `@tanstack/react-form`                                | `@tanstack/solid-form`   | **Same family** — forms are not a contested swap.                                                                    |
| `@tanstack/react-db`, `@tanstack/db`                  | `@tanstack/solid-db`     | Exists and official — **but pre-1.0 and young.** See §4, seam 2.                                                     |
| `lucide-react`                                        | `lucide-solid`           | Same icon monorepo; the icon SVG data is identical, so this swap is size-neutral.                                    |
| `sonner`                                              | `solid-sonner`           | API mirrors `sonner`; pre-1.0.                                                                                       |
| `react-markdown`                                      | `solid-markdown`         | Reuses the same remark/micromark ecosystem — the 116 KB markdown chunk does **not** shrink; only the renderer swaps. |

### Swap — contested, a real decision with no dominant winner

- **`@base-ui/react` (38 component wrappers, ~120 KB gzipped of the bundle).**
  Base UI has **no SolidJS port** — it is React-only. The Solid space offers
  three credible options and no default: **Kobalte** (closest to Radix, the
  de-facto community pick), **Corvu** (complementary primitives), and **Ark
  UI** (Chakra team, on Zag.js — exposes the _same component API for React and
  Solid_). The most consequential single choice in the migration, and per §1
  the projection's largest unknown.
- **`vaul` (drawer).** No direct port; re-implement on Corvu's drawer or Kobalte.
- **`cmdk` (command menu).** Solid ports exist but are small and thinly
  maintained — a wonky corner.
- **`qrcode.react`.** Minor; a Solid QR component exists, verify maintenance.
- **The ~12 custom hooks.** Port onto `@solid-primitives/*` or hand-write.

### No direct equivalent — rebuild on a different paradigm

- **`recharts` 3.7.0 (~115 KB gzipped with its d3 dependencies).** Solid has no
  declarative-SVG charting library equivalent to Recharts. The realistic path
  is `solid-chartjs` (Chart.js, canvas) or an ECharts wrapper — a different
  rendering model and API. It is **contained**: three files
  (`components/activity-chart.tsx`, `components/library-charts.tsx`,
  `components/ui/chart.tsx`) feeding two lazy route chunks. A scoped soft wall,
  not a blocker — and, per §1, the second-largest bundle saving.

## 4. System-by-system reconnaissance

### Seam 1 — auth, router, mounting, context, data-loader

`src/main.tsx` builds the router with a context object (`auth`, `queryClient`);
`components/auth-context.tsx` runs `AuthProvider` off Supabase
`onAuthStateChange` inside a `useLayoutEffect`; `routes/_user.tsx` is the
protected layout whose `loader` ensures the profile collection is loaded — and
uses a `fetchQuery` with a 1-second `staleTime` to dodge a post-login race;
`routes/_user/learn/$lang.tsx` validates the language in `beforeLoad` and
parallel-preloads ~10 collections in its `loader`.

The **router** half carries over recognizably: `@tanstack/solid-router` keeps
`loader` / `beforeLoad` / route context, so route files are a rewrite of the
same shapes, not a redesign. The **auth and mount-ordering** half needs careful
examination — the `useLayoutEffect` timing and that 1-second-`staleTime`
race-dodge signal that the React mount sequence here is delicate. There is real
cause for optimism, though: Solid's `createResource` + context + `onMount` tend
to express "resolve auth, then gate, then preload" more directly than React's
effect-timing dance, and the race-dodge may simply dissolve. The seam is
**contained** — a handful of files — making it an ideal early spike.

### Seam 2 — the TanStack DB collections + live-query layer

The reactive spine: ~14 collections and ~110 `useLiveQuery` call sites. In its
favor, the collection/live-query model maps **naturally onto Solid's
fine-grained signals** — arguably better than onto React. Against it,
`@tanstack/solid-db` is **pre-1.0 and young** next to the battle-tested
`@tanstack/react-db`. The risk is "new," not "missing." Because every one of
~110 call sites changes shape, this is the **most sprawling** seam. De-risk it
in isolation early rather than discovering binding limits mid-rewrite.

### Seam 3 — optimistic mutations

The `onInsert` / `onUpdate` / `onDelete` collection handlers and the
`writeInsert` / `writeUpdate` sync writes are TanStack DB _configuration_, not
React. They ride along with whatever seam 2 concludes about
`@tanstack/solid-db`; no independent React coupling.

### Seam 4 — the review feature (Zustand + Context + FSRS)

`features/review/store.ts` builds a per-session Zustand store, persisted to
`localStorage`, wrapped in a React Context and exposed through custom hooks.
The FSRS algorithm (`ts-fsrs`) is framework-agnostic and carries over untouched.
The Zustand store maps to a Solid `createStore`, and the React-Context-for-
injection wrapper likely **simplifies away** — Solid stores live outside the
component tree without provider ceremony. Contained to the review routes, and
the clearest test of the "Solid may be cleaner" hypothesis — a strong spike
candidate.

### Seam 5 — forms

Forms run on TanStack Form behind a shared `useAppForm` / `withForm` wrapper
(`src/components/form/`). Because the underlying library has a same-family
Solid binding (`@tanstack/solid-form`), this seam is a swap rather than a
rewrite into a foreign API. The shared abstraction is ported once; the ~15
forms then follow a repeatable pattern. The `withForm` HOC is the one part that
wants rethinking — HOCs are not idiomatic in Solid and become composition.

### Seam 6 — the UI primitive layer

38 wrappers in `src/components/ui/` over Base UI. With no Base UI Solid port,
this seam depends on the §3 choice among Kobalte / Corvu / Ark UI, plus
re-homing `vaul` and `cmdk`. Its character is **sprawling but shallow**: many
small, self-contained wrapper files, low conceptual risk, high file count. Not
a spike candidate — a steady body of work. The app's one `forwardRef` lives
here (`ui/chart.tsx`) and becomes a callable `ref` prop. If the team accepts
leaving Base UI, Ark UI's shared React/Solid API can make this seam closer to
mechanical.

### Seam 7 — realtime

Two hooks — `useSocialRealtime` and `useNotificationsRealtime` — subscribe to
Supabase `postgres_changes` channels and write into collections. `supabase-js`
is framework-agnostic; the only React-specific part is the `useEffect`
subscribe/unsubscribe, which becomes `onMount` / `onCleanup`. The easiest seam
in the app.

### Seam 8 — charting

`recharts` across three files (§3, bucket D). Rebuilt on a Solid charting
library with a different rendering model; contained to those files. This is
also bundle saving number two (§1).

### Seam 9 — code-splitting and odds-and-ends

`_user.tsx` uses `React.lazy` + `<Suspense>` for `AppSidebar` / `AppNav`, and
the router plugin does `autoCodeSplitting`. The code-splitting is in good
shape: `recharts`, the markdown ecosystem, every route, forms, and per-icon
chunks are all already lazy. `lazy()` and `<Suspense>` exist in Solid; Suspense
is reworked in Solid 2.0, but here it does code-split loading, not data
orchestration, so the concern is low. The two `useSyncExternalStore` uses in
`lib/lang-theme.ts` become a native Solid signal/store — a small, clean rewrite.

## 5. The per-component rewrite

Beneath the named seams sits the broad, shallow body of work: rewriting each of
~275 components' hooks and JSX. Much is mechanical — `className` to `class`,
`useMemo` to `createMemo`, deleting `useCallback`, control-flow renames. The
judgment-bearing parts are consistent and learnable: the signal getter-call
rewrite (`value` becomes `value()` at every read site), never destructuring
props, effect dependency auto-tracking, and `&&` / `.map()` becoming `<Show>` /
`<For>`. Because escape hatches are rare here (§2), this work is voluminous but
low-surprise. It is not estimated in time, by design — but note its bundle
upside is the uncounted headroom from §1.

## 6. Performance profile

- **Rendering model.** Solid's fine-grained reactivity removes VDOM diffing and
  lowers memory. Benchmarked gains concentrate in **update-heavy and large-list
  UIs** — in Sunlo, the card-by-card review flow and large phrase lists are
  where a difference could be felt; forms and mostly static pages would see
  little.
- **React Compiler interaction.** Sunlo runs the React Compiler today, which
  already auto-memoizes away unnecessary re-renders — narrowing the _runtime_
  performance delta a migration would deliver. It is, separately, a clean
  migration win: the Compiler's entire job is unnecessary in Solid, so its
  config is deleted rather than ported, and its injected memoization leaves the
  bundle (§1, uncounted upside).
- **Proportion check.** The React runtime is ~13% of the 1,090 KB main chunk
  and ~5% of the 2.93 MB total. A migration trims that slice; the data layer,
  Supabase SDK, and UI primitives — the other ~87% of the main chunk — stay.
  The bundle case for migrating is real but should not be oversold.
- **Honesty caveat.** There is no published production React-to-Solid migration
  case study with before/after numbers to cite. The bundle figures here are
  measured and projected from this repo's own build; performance figures in the
  literature are benchmark-derived and workload-dependent.

Sources: [react-dom — Bundlephobia](https://bundlephobia.com/package/react-dom),
[solid-js — Bundlephobia](https://bundlephobia.com/package/solid-js),
[js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/),
[I tried React Compiler — Developer Way](https://www.developerway.com/posts/i-tried-react-compiler).

## 7. Suggested spikes

Three contained seams are worth probing first, to surface rough edges before
any broad commitment:

1. **`@tanstack/solid-db`** — the highest-risk dependency. Stand up one
   collection and one `useLiveQuery` equivalent in isolation and confirm the
   pre-1.0 binding does what the app needs. ~110 call sites rest on the answer.
2. **Auth + router + mount** (seam 1) — port `auth-context.tsx`, `_user.tsx`,
   and one `$lang` loader. Contained, and it exercises both the `solid-router`
   binding and the mount-timing question.
3. **The review feature** (seam 4) — Zustand to Solid `createStore`. Contained,
   and the clearest test of whether Solid's idioms come out cleaner.

A fourth, optional, would settle the §1 unknown directly: port a handful of
`src/components/ui/` wrappers onto Kobalte and measure the chunk — that turns
the ±40 KB Base-UI guess into a number.
