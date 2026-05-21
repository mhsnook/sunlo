---
name: react-to-solid-feasibility
description: >-
  Produce a speculative feasibility report for migrating a React single-page
  application to SolidJS 2.0. Use when someone asks what a React-to-Solid port
  would take or gain, wants a migration assessment, or wants to scope a Solid
  rewrite of an SPA. Report-only: it assesses dependencies and architecture,
  it does not perform the migration or write Solid code.
---

# React to SolidJS Feasibility

Produce an **information report** for a team weighing a React-to-SolidJS
migration of a single-page app. The report describes what the migration would
touch, which dependencies have a clean landing zone in the Solid ecosystem and
which don't, and which architectural systems need careful examination before
anyone commits.

## What this skill is — and is not

- **Scope: SPAs only.** No SSR, no React Server Components, no Next.js / Remix
  server code. If the target repo is a server-rendered app, say so plainly and
  stop — this skill does not cover that migration.
- **Target: SolidJS 2.0.** Solid 2.0 is the assessment baseline. It introduces
  first-class async, a reworked Suspense, a split `createEffect`, and the
  removal of `<Index>`. For an SPA doing package-level analysis, the async
  model can be treated as a forward consideration rather than modelled in
  depth — flag it, don't dwell on it.
- **Report-only.** This skill assesses. It never writes Solid code, never
  edits the target repo, never runs a codemod. Its single deliverable is the
  report.
- **Information, not a recommendation.** Do **not** open with a verdict, a
  score, a go/no-go, or a "favorable / unfavorable" headline. You do not know
  the reader's appetite for large changes, their timeline, or their reasons
  for considering the move. Lay out the facts and the shape of the work; let
  the reader draw the conclusion.
- **Do not quantify effort.** No hour / day / week estimates, no story points,
  no t-shirt sizes. Counting things that exist (components, collections,
  dependencies) is fine as inventory. Converting those counts into an effort
  number is not. Characterize work qualitatively instead: "contained",
  "sprawling but shallow", "needs careful examination", "a spike would surface
  the rough edges early".

## Mental model

Two lenses produce the whole report:

1. **Dependency landing zones.** Every dependency lands somewhere on a
   spectrum: keep untouched (framework-agnostic) → swap to a clear Solid leader
   → swap into a contested/wonky space where you must pick a winner → no direct
   equivalent, rebuild on a different paradigm. The interesting content is
   _the quality of the landing zone_, not merely "this changes."
2. **Architectural seams.** A React SPA is a handful of systems — auth, the
   data/sync layer, global state, forms, the UI primitive layer, charting,
   realtime. Each ports with its own character: some carry over almost
   verbatim, some need careful examination, and for some Solid's idioms are
   genuinely _cleaner_ than the React originals. Narrate each seam.

## Process

### 1. Inventory (facts only)

- Read `package.json`: framework versions, every runtime and build dependency.
- Read the build config (`vite.config.*`, etc.): confirm it is an SPA; note
  the React plugin and whether the **React Compiler** is enabled.
- Count, roughly: component files, custom hooks, feature/module directories,
  data collections or stores.
- Grep for React-specific escape hatches: `forwardRef`, `useImperativeHandle`,
  `createPortal`, `useSyncExternalStore`, `useReducer`, HOCs, `React.*`
  namespace use. These are the seam hot spots.

### 2. Classify dependencies

Place every dependency into a landing-zone bucket using
[reference/dependency-registry.md](reference/dependency-registry.md). For a
dependency not in the registry, apply the registry's classification heuristics
and **verify maturity live** (npm last-publish date, GitHub activity, version)
— the Solid ecosystem moves, and the registry is a dated snapshot.

### 3. Identify the architectural seams

Walk the codebase and identify which of the archetypal systems in
[reference/system-archetypes.md](reference/system-archetypes.md) are present.
Use the Agent tool with `subagent_type=Explore` for breadth. For each seam,
gather the concrete facts: which files, how coupled, how contained.

### 4. Map the primitive-level rewrite

Use [reference/solid-2-semantic-map.md](reference/solid-2-semantic-map.md) to
characterize the per-component rewrite — hooks to primitives, JSX control
flow, the props rules. This informs the seam narratives (a seam thick with
`forwardRef` or stale-closure patterns is harder) and supports a short
"per-component rewrite" section. Tag patterns mechanical vs judgment; do not
turn the tags into an effort total.

### 5. Write the report

Use this structure exactly. No headline verdict.

1. **Scope & inventory** — neutral facts: it is/isn't an SPA, framework
   versions, counts, build setup, React Compiler status.
2. **Dependency landscape** — the four buckets. For _keep_ and _clear leader_,
   a list suffices. For _contested/wonky_ and _no equivalent_, name the
   contenders and describe the space honestly: is there a de-facto standard,
   or is it fragmented and unsettled?
3. **System-by-system reconnaissance** — the core. One narrative per seam:
   what carries over cleanly, what needs careful examination, where Solid's
   pattern may be cleaner, and whether the seam is contained (a good early
   spike) or sprawling.
4. **The per-component rewrite** — brief: the broad, shallow body of work of
   rewriting every component's hooks and JSX. Mechanical vs judgment, no total.
5. **Gains, as information** — framework bundle delta, the performance profile
   (and where it does _not_ help), React Compiler becoming moot. State as
   facts with sources; attach no argument.
6. **Suggested spikes** — the contained seams worth probing first to surface
   rough edges before any broad commitment.

## Reference files

- [reference/dependency-registry.md](reference/dependency-registry.md) —
  verified React-to-Solid dependency equivalence, grouped by landing zone.
- [reference/solid-2-semantic-map.md](reference/solid-2-semantic-map.md) —
  React-to-Solid-2.0 primitive mapping; mechanical vs judgment.
- [reference/system-archetypes.md](reference/system-archetypes.md) — catalog
  of common React-SPA seams and how each tends to port.
- [examples/sunlo-report.md](examples/sunlo-report.md) — a worked report for a
  real React 19 + TanStack SPA, showing tone and depth.

## Honesty rules

- If a Solid equivalent is young, pre-1.0, or thinly maintained, say so — do
  not paper over ecosystem risk.
- If no production React-to-Solid migration case study exists to cite, say so;
  do not imply field-tested certainty.
- Distinguish what you verified from what you projected. Solid 2.0 is recent;
  some guidance is forward projection. Mark it.
