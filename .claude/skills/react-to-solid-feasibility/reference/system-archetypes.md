# Architectural seam archetypes

A React SPA is not a uniform mass of components — it is a handful of
_systems_, each with its own migration character. This catalog lists the
archetypal seams and how each tends to port to SolidJS. Use it to structure
the report's system-by-system reconnaissance.

For each seam present in the target repo, write a short narrative covering:

- **Carries over** — what survives with little change.
- **Needs examination** — the specific parts where React/library quirks are
  load-bearing and the port is uncertain.
- **Cause for optimism / pessimism** — honestly. Solid's idioms are sometimes
  cleaner than the React original; sometimes they are genuinely worse or
  immature. Say which.
- **Contained or sprawling** — is this seam a small set of files (a good early
  spike) or diffuse across the whole app?

Do not score or time-estimate. Narrate.

## 1. Auth → router → mounting → context → data-loader

The wiring from "is the user logged in" through route guards, the router's
context object, app mount order, and route loaders that preload data. In React
this is usually a tangle of `AuthProvider` + `onAuthStateChange` +
`useLayoutEffect` + router `beforeLoad`/`loader` + a context object threaded
through routes.

- **Carries over:** if the router is TanStack Router, `@tanstack/solid-router`
  keeps the same `loader` / `beforeLoad` / route-context concepts — the
  _router_ part of the seam is a recognizable rewrite, not a redesign.
- **Needs examination:** the auth provider and _mount ordering_ — `useLayoutEffect`
  timing, the race between auth resolution and the first data fetch, what
  exactly is ready before the first protected route renders.
- **Cause for optimism:** Solid's `createResource` + context + `onMount` often
  expresses "load auth, then gate, then preload" _more cleanly_ than the React
  effect-timing dance. There is reasonable cause to expect this goes smoothly.
- **Contained:** usually yes — a few files. An ideal early spike: it surfaces
  router-binding and mount-timing rough edges before any broad commitment.

## 2. The data / sync layer

The reactive data backbone: TanStack DB collections + live queries, or React
Query, or SWR, or RTK Query, or a hand-rolled store.

- **TanStack Query / Table / Virtual:** official Solid bindings, near drop-in.
- **TanStack DB:** `@tanstack/solid-db` exists but is pre-1.0 — the highest-
  risk binding when the _whole app_ depends on it. The reactivity model itself
  maps _naturally_ to Solid signals (often more naturally than to React), so
  the concern is binding maturity, not conceptual fit.
- **Redux / Zustand / Jotai:** see seam 3.
- **Needs examination:** every `useLiveQuery` / `useQuery` call site changes
  shape (thunks, signal access). Sprawling — this seam usually touches the
  most files of any. Recommend an isolated spike on the binding first.

## 3. Global state stores

Zustand, Redux, Jotai, Valtio, or Context-as-store.

- **Carries over:** the _shape_ of the state and the actions.
- **Cause for optimism:** Solid's `createStore` is fine-grained and lives
  outside the component tree with no provider ceremony. Zustand/Redux stores
  frequently become _simpler_ in Solid — this seam often improves.
- **Needs examination:** any store wrapped in React Context purely for
  injection (the Context wrapper may simply disappear); middleware,
  persistence, and selector-based subscription patterns.
- **Contained:** usually — store files are few and central.

## 4. Forms

- **TanStack Form** → `@tanstack/solid-form`, same family — a clean swap.
- **react-hook-form** → `@modular-forms/solid` or `felte` — a real rewrite into
  a different API (contested space).
- **Needs examination:** any shared form abstraction (a `useAppForm` wrapper,
  field-component registry, `withForm`-style HOC) is ported once; individual
  forms then follow a repeatable pattern.
- **Contained-ish:** the abstraction is central; the forms themselves are
  many but repetitive.

## 5. The UI primitive layer

Radix / Base UI primitives + a ShadCN-style wrapper set.

- **No port exists** for Radix or Base UI — pick Kobalte, Corvu, or Ark UI
  (see the dependency registry). This is a genuine architectural decision.
- **Character:** sprawling but _shallow_ — many small wrapper files, each a
  self-contained port. Low conceptual risk, high file count. Not a spike
  candidate (no single rough edge); rather a steady body of work.
- **Cause for optimism:** Ark UI offers the same API on React and Solid, which
  can make this seam nearly mechanical _if_ the team accepts leaving Base UI.

## 6. Charting / data visualization

- **No declarative-SVG equivalent** in Solid (see registry bucket D). Rebuild
  on `solid-chartjs` or ECharts — a different rendering model.
- **Usually contained:** charts cluster in a few analytics/stats views. Flag
  as a soft wall, scoped to those files.

## 7. Realtime / websockets

Supabase channels, raw WebSockets, Pusher, socket.io.

- **Carries over almost entirely:** the client SDKs are framework-agnostic.
  The only React-specific part is the `useEffect` subscribe/unsubscribe, which
  becomes `onMount` / `onCleanup`.
- **Cause for optimism:** trivial seam. Often the easiest thing in the report.

## 8. Animation

- **framer-motion** has no full peer; `solid-motionone` + `solid-transition-group`
  cover enter/exit and basic motion. Complex layout/shared-element animation
  needs rethinking. Scope it to where the heavy animation actually is.

## 9. Code-splitting, lazy, Suspense

- `React.lazy` → `lazy()`; `<Suspense>` exists but is **reworked in Solid 2.0**.
- **Needs examination:** anywhere Suspense is doing _data_ orchestration rather
  than just code-split loading.

## 10. Imperative escape hatches

`forwardRef`, `useImperativeHandle`, `createPortal`, direct DOM refs, focus
management.

- **Portals** map cleanly (`<Portal>`).
- **`forwardRef` / `useImperativeHandle`** have no analog — each is hand-
  rewritten (`ref` is just a callable prop). Grep for these; a high count in
  one seam makes that seam harder. Usually they cluster in the UI primitive
  layer, so they fold into seam 5.
