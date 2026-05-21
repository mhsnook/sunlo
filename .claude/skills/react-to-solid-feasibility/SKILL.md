---
name: react-to-solid-feasibility
description: >-
  Produce a speculative feasibility report for migrating a React single-page
  application to SolidJS 2.0. The headline is a measured bundle projection:
  build the app, account for where every kilobyte lands, and project what it
  would weigh in SolidJS. Use when someone asks what a React-to-Solid port
  would take or gain, wants a migration assessment, wants to know the bundle
  savings, or wants to scope a Solid rewrite of an SPA. Report-only: it
  assesses, it does not perform the migration or write Solid code.
---

# React to SolidJS Feasibility

Produce an **information report** for a team weighing a React-to-SolidJS
migration of a single-page app. **The point of the report is the bundle
math.** Build the app as it stands, measure its chunks, account for where
every kilobyte lands, and project what the bundle would weigh in SolidJS if
every dependency took its default replacement. That projected delta is the
headline. The rest of the report — dependency landing zones, architectural
seams — explains the shape of the work behind that number.

## What this skill is — and is not

- **Scope: SPAs only.** No SSR, no React Server Components, no Next.js / Remix
  server code. If the target repo is a server-rendered app, say so plainly and
  stop — this skill does not cover that migration.
- **Target: SolidJS 2.0.** Solid 2.0 is the assessment baseline. It introduces
  first-class async, a reworked Suspense, a split `createEffect`, and the
  removal of `<Index>`. For an SPA doing package-level analysis, the async
  model can be treated as a forward consideration rather than modelled in
  depth — flag it, don't dwell on it.
- **Report-only.** This skill assesses. It never writes Solid code, never edits
  the target repo's source, never runs a codemod. It _does_ build the app to
  measure it. Its single written deliverable is the report.
- **Lead with the bundle number — that is information, not a verdict.** The
  report opens, in the first paragraph, with the measured current bundle and
  the projected SolidJS bundle: "ships ~X KB today; ~Y KB projected in Solid;
  ~Z KB saved, ~W KB of it from the main chunk." That is a fact. What you must
  _not_ do is open with a go/no-go, a score, or a "favorable / unfavorable"
  judgment — you do not know the reader's appetite for change. Give the number
  and the shape of the work; let the reader conclude.
- **Do not quantify effort.** Bundle size is measured and projected — that is
  the job. _Effort_ is different: no hour / day / week estimates, no story
  points, no t-shirt sizes. Counting things (components, collections) is fine
  as inventory; converting counts into an effort number is not. Characterize
  work qualitatively: "contained", "sprawling but shallow", "a spike would
  surface the rough edges early".

## Mental model

Three lenses, in priority order:

1. **Bundle accounting — the headline.** Build the app. Measure total JS and
   the always-loaded main/entry chunk, raw and gzipped. Attribute kilobytes to
   npm packages. Then project: swap each package for its registry default and
   re-sum. The delta, split into total vs main-chunk, is the report's lead.
2. **Dependency landing zones.** Every dependency lands somewhere: keep
   untouched → swap to a clear Solid leader → swap into a contested space → no
   direct equivalent, rebuild. The interesting content is _the quality of the
   landing zone_. This lens also supplies the replacement choices the bundle
   projection needs.
3. **Architectural seams.** A React SPA is a handful of systems — auth, the
   data/sync layer, global state, forms, the UI primitive layer, charting,
   realtime. Each ports with its own character. Narrate each seam.

## Process

### 1. Inventory (facts only)

- Read `package.json`: framework versions, every runtime and build dependency,
  the build command.
- Read the build config (`vite.config.*`, etc.): confirm it is an SPA; note
  the React plugin and whether the **React Compiler** is enabled.
- Count, roughly: component files, custom hooks, feature/module directories,
  data collections or stores.
- Grep for React-specific escape hatches: `forwardRef`, `useImperativeHandle`,
  `createPortal`, `useSyncExternalStore`, `useReducer`, HOCs, `React.*`
  namespace use.

### 2. Build and measure the bundle

This is the core measurement — do not skip or estimate it away.

- Install dependencies and run the production build (`pnpm build` / `npm run
build`). If the build cannot run in this environment, say so explicitly in
  the report and fall back to per-package sizes from bundlephobia, clearly
  labelled as estimates.
- Record **total JS** (sum of all emitted chunks) and the **entry/main chunk**
  (the always-loaded one), both **raw and gzipped**. Vite prints gzip sizes
  per chunk.
- Attribute kilobytes to packages. Run a bundle visualizer that emits machine-
  readable output — e.g. `npx vite-bundle-visualizer --template raw-data -o
/tmp/bundle.json` (or `rollup-plugin-visualizer`, or `source-map-explorer`
  on a sourcemap build). Parse it for per-package size.
- Note which packages land in the **main chunk** (loaded on every visit) vs
  **lazy route chunks** (loaded on demand). This split decides how the savings
  are reported.

### 3. Classify dependencies

Place every dependency into a landing-zone bucket using
[reference/dependency-registry.md](reference/dependency-registry.md). For a
dependency not in the registry, apply the registry heuristics and **verify
maturity live** (npm last-publish date, GitHub activity, version). Record the
_default replacement_ for each — the projection needs it.

### 4. Project the SolidJS bundle

For each measured package, take its default replacement and its size:

- **Framework** (`react` + `react-dom` → `solid-js`): the largest, most
  defensible delta. Get real sizes (bundlephobia or measure). Note that Solid
  compiles some machinery into component output, so the framework _chunk_
  shrinks dramatically but it is not a pure package-size subtraction.
- **No-equivalent removals** (e.g. `recharts`): subtract the package, add the
  replacement charting library's weight.
- **Contested swaps** (Base UI → Kobalte, etc.): estimate from the
  replacement's published size.
- **Clear-leader swaps within a shared-core family** (TanStack `react-*` →
  `solid-*`): treat as roughly neutral.
- **Kept** dependencies and **app source**: zero delta. Do not claim app-code
  savings — be conservative; the headline must survive scrutiny.

Sum the deltas. Split into a **total** saving and a **main-chunk** saving
(deltas for packages in the always-loaded chunk). Present as a projection with
its uncertainty stated: the framework delta is near-certain; replacement-
library deltas are estimates.

### 5. Identify the architectural seams

Walk the codebase for the archetypal systems in
[reference/system-archetypes.md](reference/system-archetypes.md). Use the Agent
tool with `subagent_type=Explore` for breadth. For each seam, gather concrete
facts: which files, how coupled, how contained.

### 6. Map the primitive-level rewrite

Use [reference/solid-2-semantic-map.md](reference/solid-2-semantic-map.md) to
characterize the per-component rewrite. Tag patterns mechanical vs judgment; do
not turn the tags into an effort total.

### 7. Write the report

Open with a first paragraph that states the headline bundle delta. Then use
this structure:

1. **Bundle projection** — the headline. The measured current bundle (total +
   main, raw + gzip), the projected SolidJS bundle, the delta, and the
   per-package breakdown of where the savings come from. State the method and
   the uncertainty.
2. **Scope & inventory** — neutral facts: it is/isn't an SPA, framework
   versions, counts, build setup, React Compiler status.
3. **Dependency landscape** — the four buckets. List _keep_ and _clear leader_;
   for _contested_ and _no equivalent_, name the contenders and describe the
   space honestly.
4. **System-by-system reconnaissance** — one narrative per seam: what carries
   over, what needs examination, where Solid is cleaner, contained vs sprawling.
5. **The per-component rewrite** — brief: the broad, shallow body of work.
   Mechanical vs judgment, no total.
6. **Performance profile** — the non-bundle perf picture and where it does
   _not_ help; React Compiler becoming moot. Facts with sources, no argument.
7. **Suggested spikes** — contained seams worth probing first.

## Reference files

- [reference/dependency-registry.md](reference/dependency-registry.md) —
  verified React-to-Solid dependency equivalence, grouped by landing zone.
- [reference/solid-2-semantic-map.md](reference/solid-2-semantic-map.md) —
  React-to-Solid-2.0 primitive mapping; mechanical vs judgment.
- [reference/system-archetypes.md](reference/system-archetypes.md) — catalog of
  common React-SPA seams and how each tends to port.
- [examples/sunlo-report.md](examples/sunlo-report.md) — a worked report for a
  real React 19 + TanStack SPA, showing tone and depth.

## Honesty rules

- The bundle projection is a _projection_. State which parts are measured
  (current bundle) and which are estimated (replacement-library sizes). The
  framework delta is near-certain; do not present the rest as equally firm.
- If a Solid equivalent is young, pre-1.0, or thinly maintained, say so.
- If no production React-to-Solid migration case study exists to cite, say so.
- Distinguish what you verified from what you projected. Solid 2.0 is recent.
