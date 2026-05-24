# Dependency landing zones: React to SolidJS

A verified snapshot of where common React-ecosystem dependencies land in the
SolidJS ecosystem. **Snapshot date: 2026-05.** The Solid ecosystem moves; when
you use this, re-verify maturity for anything load-bearing (npm last-publish
date, GitHub stars and last commit, version number).

Four buckets, by the quality of the landing zone:

- **A — Keep.** Framework-agnostic. Zero change.
- **B — Swap, clear leader.** Must change, but there is one obvious target.
- **C — Swap, contested.** Must change, and the Solid space is fragmented or
  unsettled — a real choice with no dominant winner.
- **D — No direct equivalent.** Rebuild on a different paradigm.

## A — Keep (framework-agnostic, zero change)

Anything with no React coupling carries over untouched. Common members:

- **Validation / data:** `zod`, `valibot`, `yup`
- **Dates:** `dayjs`, `date-fns`, `luxon`
- **Utility:** `lodash`, `clsx`, `tailwind-merge`, `class-variance-authority`
- **Styling:** `tailwindcss` and its plugins, `tailwindcss-animate`, plain CSS
- **Backend SDKs:** `@supabase/supabase-js`, `firebase`, REST/GraphQL clients
- **Algorithms / domain logic:** anything pure-TS (e.g. `ts-fsrs`)
- **Fonts, icons-as-data, i18n message catalogs**

Heuristic: if it never imports `react` and emits no JSX, it is bucket A.

## B — Swap, clear leader (one obvious target)

| React                                   | Solid target              | Notes                                                                                                                                                        |
| --------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `react` + `react-dom`                   | `solid-js`                | The runtime. ~7 KB gzip vs ~44 KB.                                                                                                                           |
| `@vitejs/plugin-react`                  | `vite-plugin-solid`       | Official, mature, drop-in plugin swap.                                                                                                                       |
| `babel-plugin-react-compiler`           | _(deleted)_               | Solid has no re-render to memoize. The compiler's whole job vanishes; remove it, no port.                                                                    |
| `@tanstack/react-query`                 | `@tanstack/solid-query`   | Same monorepo. `useQuery` takes a thunk; data is a signal. Near drop-in.                                                                                     |
| `@tanstack/react-router`                | `@tanstack/solid-router`  | Same file-based concepts (`loader`, `beforeLoad`, context). Route files are a real rewrite; the Solid binding is younger than the React one.                 |
| `@tanstack/react-table`                 | `@tanstack/solid-table`   | Shared headless core; only the adapter differs.                                                                                                              |
| `@tanstack/react-virtual`               | `@tanstack/solid-virtual` | Shared core. Near drop-in.                                                                                                                                   |
| `@tanstack/react-form`                  | `@tanstack/solid-form`    | Same family. Near drop-in — the form library itself is _not_ a contested swap.                                                                               |
| `@tanstack/react-db`                    | `@tanstack/solid-db`      | **Exists, but pre-1.0 and young — see the caveat below.**                                                                                                    |
| `lucide-react`                          | `lucide-solid`            | Same icon monorepo. Drop-in.                                                                                                                                 |
| `sonner`                                | `solid-sonner`            | Community; `toast()` API mirrors `sonner`. Pre-1.0.                                                                                                          |
| `react-helmet` / head mgmt              | `@solidjs/meta`           | Official Solid-core. `<Title>`, `<Meta>`, `<Link>`.                                                                                                          |
| `react-markdown`                        | `solid-markdown`          | Community port of `react-markdown`, tracks it reasonably closely.                                                                                            |
| `@uidotdev/usehooks` & ad-hoc hook libs | `@solid-primitives/*`     | The `solid-primitives` org is a broad, curated, officially-blessed catalog (storage, intersection observer, scheduled/debounce, media, etc.). Port per-hook. |

## C — Swap, contested (a real choice, no dominant winner)

### UI primitives (Radix / Base UI)

There is **no Solid port of Base UI or Radix.** Base UI (`@base-ui/react`,
the MUI-team unstyled library) and Radix are React-only. The Solid space has
three credible options and no single default:

- **Kobalte** (`@kobalte/core`) — the closest analog to Radix; the de-facto
  community choice for accessible Solid primitives. Most-used, but community-
  maintained and not fast-moving.
- **Corvu** — a complementary set of unstyled primitives (drawer, popover,
  etc.); often used _alongside_ Kobalte rather than instead of it.
- **Ark UI** (`@ark-ui/solid`) — by the Chakra team, built on Zag.js finite-
  state machines. Notably it exposes the **same component API for React and
  Solid** (and Vue/Svelte). If a team is willing to leave Base UI/Radix
  anyway, this is the lowest-friction primitive layer and the one place the
  migration can be made nearly mechanical.

Call this out as a genuine decision, not a swap.

### The ShadCN layer

ShadCN is copy-paste React components over Radix. Solid analogs:
`shadcn-solid` (built on Kobalte + Corvu) and `solid-ui`. Both are community,
unofficial, and **less complete and slower-moving than React ShadCN.** Expect
to port some components by hand regardless.

### Other contested swaps

| React                      | Solid space                                                                        | Character                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `react-hook-form`          | `@modular-forms/solid` (modern, recommended) vs `felte` (older, quieter)           | Real rewrite; pick one. _(If the app uses TanStack Form, that is bucket B — `@tanstack/solid-form`.)_ |
| `framer-motion` / `motion` | `solid-motionone` (active) + `solid-transition-group`; `@motionone/solid` is stale | Usable for enter/exit and basic motion; **no `framer-motion`-grade layout-animation peer.**           |
| `vaul` (drawer)            | Corvu drawer, or Kobalte                                                           | No direct port; re-implement on a Solid primitive.                                                    |
| `cmdk` (command menu)      | `cmdk-solid`, or build on Kobalte                                                  | Small, thinly maintained ports; wonky.                                                                |
| `react-i18next`            | `@solid-primitives/i18n`                                                           | Lightweight; lacks i18next's plugin ecosystem (ICU, backends).                                        |
| `react-dnd`                | `@thisbeyond/solid-dnd`                                                            | Different API; a rewrite.                                                                             |

## D — No direct equivalent (rebuild on a different paradigm)

- **Charting — `recharts`, `victory`, `nivo`.** Solid has no declarative-SVG
  charting library equivalent to Recharts. The realistic path is `solid-chartjs`
  (Chart.js, canvas) or an ECharts wrapper — a _different_ API and rendering
  model. The chart layer is rebuilt, not ported. Usually contained (charts
  cluster in a few stats/analytics views), so flag it as a soft wall, not a
  blocker.
- **Anything reaching into React internals** — `react-dom` APIs, fiber-aware
  libraries, `react-test-renderer`, `@testing-library/react`. No port; needs a
  Solid-native counterpart (`@solidjs/testing-library`).
- **React-specific devtools / profilers** — replace with Solid devtools.

## The TanStack DB caveat

`@tanstack/solid-db` exists and is official, but it is **pre-1.0 and young**
relative to `@tanstack/react-db`. For an app whose entire reactive data layer
runs through TanStack DB collections and `useLiveQuery`, this is the single
highest-risk binding in the whole migration — not because it is missing, but
because it is new. Always recommend an early, isolated spike against it.

## Classifying a dependency not listed here

1. Does it import `react` / emit JSX? **No → bucket A.**
2. Is it part of a framework-agnostic family with an official Solid adapter
   (TanStack, etc.)? **Yes → bucket B.**
3. Search `npm` for `solid-<name>` / `@<scope>/solid-*`. One actively-
   maintained option → **B**. Several, or all thin/stale → **C**.
4. Nothing credible → **D**; describe what rebuilding it would mean.
