# React to SolidJS feasibility: Sunlo

A speculative feasibility report for migrating Sunlo from React 19 to SolidJS
2.0. This is information for a migration decision — it describes what the
migration would touch and the character of the work. It does not recommend for
or against, and it does not estimate effort in time.

_Assessment baseline: SolidJS 2.0. Generated 2026-05-21 against branch
`claude/react-solidjs-migration-tool`._

## 1. Scope & inventory

Sunlo is a **single-page app** — Vite 8 + React 19, client-rendered, no SSR or
RSC. It is in scope for this skill. A root `middleware.ts` exists; it is
deployment-edge logic, not part of the React tree, and sits outside the
migration surface (worth confirming it does no server rendering, but it does
not change the SPA classification).

| Fact                      | Value                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| Framework                 | React 19.2.3 / react-dom 19.2.3                                      |
| Build                     | Vite 8, `@vitejs/plugin-react` 6                                     |
| React Compiler            | **Enabled** — `babel-plugin-react-compiler` 1.0.0 via a Babel preset |
| Component files (`.tsx`)  | ~275                                                                 |
| Other `.ts` files         | ~119                                                                 |
| Custom hooks              | ~12                                                                  |
| Feature modules           | 9 (`src/features/*`)                                                 |
| Data collections          | ~14, across 9 `collections.ts` files                                 |
| `useLiveQuery` call sites | ~110                                                                 |
| UI primitive wrappers     | 38 (`src/components/ui/`)                                            |
| Forms                     | ~15, on TanStack Form                                                |
| Realtime subscriptions    | 2 hooks                                                              |

React-specific escape hatches are **rare**, which matters for the migration:
`forwardRef` appears once (`components/ui/chart.tsx`), `useImperativeHandle`
zero times, `createPortal` zero, `useReducer` zero. `useSyncExternalStore`
appears twice, both in `src/lib/lang-theme.ts`. The app is built on hooks and
modern patterns, not on imperative React internals.

## 2. Dependency landscape

### Keep — framework-agnostic, zero change

`zod`, `dayjs`, `class-variance-authority`, `clsx`, `tailwind-merge`,
`tailwindcss` and every Tailwind plugin (`@tailwindcss/vite`,
container-queries, line-clamp, typography), `tailwind-oklch`,
`tailwindcss-animate`, `@supabase/supabase-js`, `ts-fsrs`, the Fontsource
fonts. The `tailwind-oklch` color system and the `cn()` helper carry over
untouched. Vite itself stays.

This is a large fraction of the dependency list and includes the entire
styling system — a meaningful point in the app's favor.

### Swap — clear leader, one obvious target

| Current                                                                         | Target                   | Note                                                                   |
| ------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `react` + `react-dom`                                                           | `solid-js`               | The runtime swap.                                                      |
| `@vitejs/plugin-react`, `@rolldown/plugin-babel`, `babel-plugin-react-compiler` | `vite-plugin-solid`      | The Babel + React-Compiler wiring is **deleted**, not ported (see §5). |
| `@tanstack/react-query` (+ devtools)                                            | `@tanstack/solid-query`  | Same monorepo; near drop-in.                                           |
| `@tanstack/react-router` (+ router-plugin, devtools)                            | `@tanstack/solid-router` | Same loader / beforeLoad / context concepts.                           |
| `@tanstack/react-form`                                                          | `@tanstack/solid-form`   | **Same family** — the form library is not a contested swap.            |
| `@tanstack/react-db`, `@tanstack/db`, `@tanstack/query-db-collection`           | `@tanstack/solid-db`     | Exists and official — **but pre-1.0 and young.** See §3, seam 2.       |
| `lucide-react`                                                                  | `lucide-solid`           | Same icon monorepo; drop-in.                                           |
| `sonner`                                                                        | `solid-sonner`           | API mirrors `sonner`; pre-1.0.                                         |
| `react-markdown`                                                                | `solid-markdown`         | Community port that tracks `react-markdown`.                           |

One unknown: **`@tanstack/intent` (0.0.29)** is a very new TanStack package; a
Solid story for it should be verified directly before relying on this row.

### Swap — contested, a real decision with no dominant winner

- **`@base-ui/react` (38 component wrappers).** Base UI has **no SolidJS
  port** — it is a React-only library from the MUI team. The Solid space
  offers three credible, non-overlapping options and no default: **Kobalte**
  (closest to Radix, the de-facto community pick), **Corvu** (complementary
  primitives, often used alongside Kobalte), and **Ark UI** (Chakra team, on
  Zag.js — notably exposes the _same component API for React and Solid_).
  Choosing among these is an architectural decision, not a swap. It is the
  single most consequential dependency call in the migration.
- **`vaul` (drawer).** No direct port; re-implement on Corvu's drawer or
  Kobalte.
- **`cmdk` (command menu).** Solid ports (`cmdk-solid`) exist but are small
  and thinly maintained — a wonky corner.
- **`qrcode.react`.** Minor; a Solid QR component exists but verify maintenance.
- **The ~12 custom hooks.** Port individually onto `@solid-primitives/*`, a
  broad and officially-curated catalog, or hand-write.

### No direct equivalent — rebuild on a different paradigm

- **`recharts` 3.7.0.** Solid has no declarative-SVG charting library
  equivalent to Recharts. The realistic path is `solid-chartjs` (Chart.js,
  canvas) or an ECharts wrapper — a different rendering model and API. The
  chart layer is rebuilt, not ported. It is **contained**: three files
  (`components/activity-chart.tsx`, `components/library-charts.tsx`,
  `components/ui/chart.tsx`). Treat it as a scoped soft wall, not a blocker.

## 3. System-by-system reconnaissance

### Seam 1 — auth, router, mounting, context, data-loader

`src/main.tsx` builds the router with a context object (`auth`, `queryClient`);
`components/auth-context.tsx` runs `AuthProvider` off Supabase
`onAuthStateChange` inside a `useLayoutEffect`; `routes/_user.tsx` is the
protected layout whose `loader` ensures the profile collection is loaded — and
notably uses a `fetchQuery` with a 1-second `staleTime` to dodge a post-login
race; `routes/_user/learn/$lang.tsx` validates the language in `beforeLoad` and
parallel-preloads ~10 collections in its `loader`.

The **router** half of this seam carries over recognizably:
`@tanstack/solid-router` keeps `loader`, `beforeLoad`, and route context, so
the route files are a rewrite of the same shapes, not a redesign. The **auth
and mount-ordering** half needs careful examination — the `useLayoutEffect`
timing and that 1-second-`staleTime` race-dodge are a tell that the React mount
sequence here is delicate. That said, there is real cause for optimism: Solid's
`createResource` + context + `onMount` tends to express "resolve auth, then
gate, then preload" more directly than React's effect-timing dance, and the
race-dodge may simply dissolve. The seam is **contained** — a handful of files
— which makes it an ideal early spike that surfaces both the router-binding and
the mount-timing rough edges before any broad commitment.

### Seam 2 — the TanStack DB collections + live-query layer

This is the reactive spine of the app: ~14 collections and ~110 `useLiveQuery`
call sites. Two things pull in opposite directions. In its favor: the
collection/live-query model maps **naturally onto Solid's fine-grained
signals** — arguably more naturally than onto React, since Solid is built for
exactly this kind of granular subscription. Against it: `@tanstack/solid-db` is
**pre-1.0 and young** next to the battle-tested `@tanstack/react-db`. The risk
here is not "missing," it is "new." And because every one of the ~110 call
sites changes shape, this is the **most sprawling** seam in the app. The
sensible move is to de-risk it in isolation early (see §6) rather than discover
binding limitations halfway through 110 rewrites.

### Seam 3 — optimistic mutations

The `onInsert` / `onUpdate` / `onDelete` collection handlers and the
`collection.utils.writeInsert` / `writeUpdate` sync writes are TanStack DB
_configuration_, not React. They ride along with whatever seam 2 concludes
about `@tanstack/solid-db`; they carry no independent React coupling.

### Seam 4 — the review feature (Zustand + Context + FSRS)

`features/review/store.ts` builds a per-session Zustand store
(`createReviewStore(lang, dayString)`), persisted to `localStorage`, wrapped in
a React Context and exposed through custom hooks. The FSRS algorithm is
`ts-fsrs` — framework-agnostic, carries over untouched. The Zustand store maps
to a Solid `createStore`, and the React-Context-for-injection wrapper likely
**simplifies away** — Solid stores live outside the component tree without
provider ceremony. This seam is **contained** (the review routes only) and is
where the "Solid may be cleaner" hypothesis is most testable, so it is a strong
spike candidate.

### Seam 5 — forms

Forms run on TanStack Form behind a shared `useAppForm` / `withForm` wrapper
(`src/components/form/`), with field components and form-parts. Because the
underlying library has a same-family Solid binding (`@tanstack/solid-form`),
this seam is a swap rather than a rewrite-into-a-foreign-API. The shared
abstraction is ported once; the ~15 forms then follow a repeatable pattern. The
`withForm` HOC is the one part that wants rethinking — HOCs are not idiomatic
in Solid and would become composition.

### Seam 6 — the UI primitive layer

38 wrappers in `src/components/ui/` over Base UI. With no Base UI Solid port,
this seam depends on the §2 decision among Kobalte / Corvu / Ark UI, plus
re-homing `vaul` and `cmdk`. Its character is **sprawling but shallow**: many
small, self-contained wrapper files, low conceptual risk, high file count. It
is not a spike candidate — there is no single rough edge to probe — it is a
steady body of work. The one `forwardRef` in the app lives here
(`ui/chart.tsx`) and is hand-rewritten as a callable `ref` prop. If the team is
willing to leave Base UI anyway, Ark UI's shared React/Solid API can make this
seam closer to mechanical.

### Seam 7 — realtime

Two hooks — `useSocialRealtime` and `useNotificationsRealtime` — subscribe to
Supabase `postgres_changes` channels and write into collections. `supabase-js`
is framework-agnostic; the only React-specific part is the `useEffect`
subscribe/unsubscribe, which becomes `onMount` / `onCleanup`. This is the
easiest seam in the app.

### Seam 8 — charting

`recharts` across three files (§2, bucket D). Rebuilt on a Solid charting
library with a different rendering model. Contained to those files.

### Seam 9 — code-splitting and odds-and-ends

`_user.tsx` uses `React.lazy` + `<Suspense>` for `AppSidebar` / `AppNav`, and
the router plugin does `autoCodeSplitting`. `lazy()` and `<Suspense>` both
exist in Solid; Suspense is reworked in Solid 2.0, but here it is doing
code-split loading, not data orchestration, so the concern is low. Separately,
the two `useSyncExternalStore` uses in `lib/lang-theme.ts` become a native
Solid signal/store — a small, clean rewrite.

## 4. The per-component rewrite

Beneath the named seams sits the broad, shallow body of work: rewriting each of
~275 components' hooks and JSX. Much of it is mechanical — `className` to
`class`, `useMemo` to `createMemo`, deleting `useCallback`, fragment and
control-flow renames. The judgment-bearing parts are consistent and learnable:
the signal getter-call rewrite (`value` becomes `value()` at every read site),
never destructuring props, effect dependency auto-tracking, and `&&` / `.map()`
becoming `<Show>` / `<For>`. Because escape hatches are rare here (§1), this
work is voluminous but low-surprise. It is not estimated in time by design.

## 5. Gains, as information

- **Framework bundle.** `react` + `react-dom` is roughly 44 KB min+gzip;
  `solid-js` is roughly 7 KB — a framework-layer reduction of about
  **37–40 KB**. Against an app of ~275 components plus its own non-framework
  dependencies, this is real but modest; the app's own code dominates the
  bundle.
- **Performance profile.** Solid's fine-grained reactivity removes VDOM
  diffing and lowers memory. The benchmarked gains concentrate in
  **update-heavy and large-list UIs** — in Sunlo, the card-by-card review flow
  and large phrase lists are where a difference could be felt; forms and mostly
  static pages would see little.
- **React Compiler interaction.** Sunlo runs the React Compiler today, which
  already auto-memoizes away unnecessary re-renders. That narrows the
  _performance_ delta a migration would deliver — much of what Solid gives
  natively, the Compiler is already approximating. It is, separately, a clean
  migration win: the Compiler's entire job is unnecessary in Solid, so its
  config is deleted rather than ported.
- **Honesty caveat.** There is no published production React-to-Solid
  migration case study with before/after numbers to cite. The bundle figure is
  verifiable; the performance figures are benchmark-derived and
  workload-dependent.

Sources: [react-dom — Bundlephobia](https://bundlephobia.com/package/react-dom),
[solid-js — Bundlephobia](https://bundlephobia.com/package/solid-js),
[js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/),
[I tried React Compiler — Developer Way](https://www.developerway.com/posts/i-tried-react-compiler).

## 6. Suggested spikes

Three contained seams are worth probing first, to surface rough edges before
any broad commitment:

1. **`@tanstack/solid-db`** — the highest-risk dependency. Stand up one
   collection and one `useLiveQuery` equivalent in isolation and confirm the
   pre-1.0 binding does what the app needs. Everything in seam 2 (and ~110 call
   sites) rests on the answer.
2. **Auth + router + mount** (seam 1) — port `auth-context.tsx`, `_user.tsx`,
   and one `$lang` loader. Contained, and it surfaces both the
   `solid-router` binding and the mount-timing question (does the 1-second
   race-dodge survive, or dissolve?).
3. **The review feature** (seam 4) — Zustand to Solid `createStore`. Contained
   to the review routes, and the clearest test of whether Solid's idioms come
   out cleaner than the React originals.

Each is small, self-contained, and load-bearing — together they convert the
biggest unknowns in this report into observed facts.
