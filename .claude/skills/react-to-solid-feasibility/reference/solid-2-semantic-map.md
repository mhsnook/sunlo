# React to SolidJS 2.0: the primitive-level map

How React building blocks translate to SolidJS 2.0. Each item is tagged:

- **MECHANICAL** — a codemod could do it; a rename or a fixed transformation.
- **JUDGMENT** — needs a human or AI to reason about intent; the trap-prone
  work where a migration's real cost lives.

This map exists to _characterize_ the per-component rewrite and to make the
seam narratives concrete. Do not turn the tag counts into an effort estimate.

## The one idea behind all of it

React re-runs a component function on every render; SolidJS runs each
component function **once** and wires fine-grained reactivity into the parts
that change. Almost every trap below is a corollary of that single difference.

## Hooks to primitives

| React                          | Solid 2.0                                                                          | Tag        | Trap                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useState`                     | `createSignal`                                                                     | JUDGMENT   | The getter is a _function call_: `count` becomes `count()`. Every read site changes, and only reads inside a tracking scope (JSX, effects, memos) stay reactive. |
| `useEffect`                    | `createEffect` (in 2.0, split into a tracked `compute` phase and an `apply` phase) | JUDGMENT   | No dependency array — dependencies are auto-tracked from what is read _synchronously_. Reads after an `await` are not tracked: silent reactivity loss.           |
| `useEffect(fn, [])` "run once" | `onMount` / 2.0 `onSettled`                                                        | MECHANICAL | —                                                                                                                                                                |
| `useMemo`                      | `createMemo`                                                                       | MECHANICAL | Drop the dependency array.                                                                                                                                       |
| `useCallback`                  | _(delete)_                                                                         | MECHANICAL | Components run once; function identity is already stable.                                                                                                        |
| `useRef` (value box)           | a plain `let` variable                                                             | JUDGMENT   | If `.current` was _read during render_, it must become a signal instead.                                                                                         |
| `useRef` (DOM)                 | `let el; <div ref={el}>`                                                           | MECHANICAL | Different mechanism, simple shape.                                                                                                                               |
| `useContext`                   | `createContext` + `useContext`                                                     | MECHANICAL | Near-identical API.                                                                                                                                              |
| `useReducer`                   | `createStore` + a dispatch function                                                | JUDGMENT   | No built-in `useReducer`; hand-roll the pattern.                                                                                                                 |
| `useSyncExternalStore`         | a signal / store wrapping the external source                                      | JUDGMENT   | Solid subscribes natively; the React shim disappears.                                                                                                            |
| custom hooks                   | "composables" — plain functions returning signals/stores                           | JUDGMENT   | Must obey call-once. Conditional/looped calls are _legal_ in Solid, but logic that assumed per-render re-execution must be rewritten.                            |

## The reactivity-model traps (all JUDGMENT)

- **Components run once.** Code that recomputed a derived value in the body on
  each render must move into a `createMemo` or an accessor function.
- **Never destructure props.** Props are reactive getters. `const { x } = props`
  reads once and freezes it. Use `props.x` directly; `splitProps` to split
  reactively; `mergeProps` for defaults. Spreading props through `Object.assign`
  also breaks reactivity.
- **No stale-closure bug class** (no dependency arrays) — but a new trap:
  reading a signal _outside_ a tracking scope yields a one-time snapshot.

## JSX and control flow

| React                | Solid                                                    | Tag        | Notes                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{cond && <X/>}`     | `<Show when={cond()}>`                                   | JUDGMENT   | Raw `&&` won't re-evaluate; also handle falsy `0`/`''`.                                                                                                                               |
| `{list.map(...)}`    | `<For>` (keyed by reference) or `<For keyed={false}>`    | JUDGMENT   | In 2.0 `<Index>` is removed; `<For keyed={false}>` replaces it. Choose `<For>` for reorderable lists, `keyed={false}` for fixed-position/primitive lists. Children receive accessors. |
| ternary chains       | `<Switch>` / `<Match>`                                   | JUDGMENT   | —                                                                                                                                                                                     |
| `className`          | `class` (plus `classList`)                               | MECHANICAL | —                                                                                                                                                                                     |
| `<>...</>` fragments | same                                                     | MECHANICAL | —                                                                                                                                                                                     |
| `createPortal`       | `<Portal>`                                               | MECHANICAL | —                                                                                                                                                                                     |
| `<Suspense>`         | `<Suspense>`, reworked in 2.0 (`isPending`, `<Loading>`) | JUDGMENT   | Semantics differ; data-driven suspense needs review.                                                                                                                                  |
| `ErrorBoundary`      | `<ErrorBoundary>`                                        | MECHANICAL | —                                                                                                                                                                                     |
| `React.lazy`         | `lazy()`                                                 | MECHANICAL | —                                                                                                                                                                                     |
| event handlers       | `onClick` etc., delegated; `on:` for native              | MECHANICAL | Mostly identical.                                                                                                                                                                     |

## State management

- **Signals** for atomic values; **`createStore`** (a proxy) for nested
  objects/arrays with fine-grained per-property updates. Choosing between them
  is JUDGMENT.
- React `useState(object)` often becomes a `createStore`. `useReducer` + Context
  becomes `createStore` + a provider. **Zustand** becomes a module-level Solid
  store — and Solid stores live happily outside components with no provider
  ceremony, so this is frequently a _cleaner_ result, not just a port.

## Genuinely hard — no clean analog (all JUDGMENT)

- **`forwardRef` / `useImperativeHandle`.** No equivalent. `ref` is just a prop
  you may call: `props.ref?.(api)`. It works, but every imperative-handle
  component is hand-rewritten.
- **Render props / HOCs.** Render props mostly work if they respect call-once.
  HOCs that wrap-and-re-render are an anti-pattern in Solid; rethink as
  primitives or `<Dynamic>`.
- **Suspense-for-data.** Solid 2.0 reworks Suspense around first-class async;
  data-fetching layers tied to React Suspense need real rethinking.
- Anything depending on VDOM reconciliation, key-based remounting, or
  `StrictMode` double-invocation.

## React Compiler

`babel-plugin-react-compiler` auto-inserts memoization to skip re-renders
_within React's component-re-execution model_. Solid has **no re-execution to
skip** — fine-grained reactivity updates DOM nodes directly. So the compiler's
entire job is unnecessary in Solid. Practical consequences for a migration:

- The compiler config and any `babel`/plugin wiring is **deleted**, not ported.
- A React-Compiler codebase tends to carry _less_ manual `useMemo`/`useCallback`
  bloat, which makes it marginally _easier_ to migrate.
- `useCallback` disappears entirely; most `useMemo` does too.

## Solid 2.0 specifics to keep in mind

- `createEffect` is split into a tracked `compute` phase and an `apply` phase.
- `<Index>` is removed — use `<For keyed={false}>`.
- `onMount` gains `onSettled` (can return cleanup).
- First-class async: memos/computations may return Promises; the graph
  suspends and resumes; Suspense is reworked. For SPA package-level analysis
  this is a _forward consideration_ — name it, don't model it.
- Solid 2.0 is recent. Treat 2.0-specific guidance as projection, and say so.
