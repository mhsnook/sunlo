# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It stays deliberately short: what exists, where it lives, and the rules that prevent real damage. Detailed guides live in `docs/` and load on demand via the mappings below.

<!-- intent-skills:start -->

# Skill mappings - when working in these areas, load the linked skill file into context.

skills:

- task: "Creating or modifying TanStack DB collections in src/features/\*/collections.ts"
  load: "node_modules/@tanstack/db/skills/db-core/collection-setup/SKILL.md"

- task: "Writing or modifying useLiveQuery hooks, joins, filters, or derived collections"
  load: "node_modules/@tanstack/db/skills/db-core/live-queries/SKILL.md"

- task: "Wiring optimistic mutations — collection.insert, collection.update, collection.delete, writeInsert, writeUpdate in onSuccess handlers"
  load: "node_modules/@tanstack/db/skills/db-core/mutations-optimistic/SKILL.md"

- task: "Route loaders, collection.preload(), or integrating collections with TanStack Router"
  load: "node_modules/@tanstack/db/skills/meta-framework/SKILL.md"

- task: "Using React bindings — useLiveQuery, useLiveSuspenseQuery, useLiveInfiniteQuery, usePacedMutations from @tanstack/react-db"
  load: "node_modules/@tanstack/react-db/skills/react-db/SKILL.md"

- task: "Reviewing or improving codebase architecture — surfacing shallow modules, deepening seams, improving testability and AI-navigability"
  load: ".claude/skills/improve-codebase-architecture/SKILL.md"

<!-- intent-skills:end -->

docs:

- task: "Writing any mutation — persistence handlers, optimistic state, refetch decisions, forms, realtime sync, feed invalidation"
  load: "docs/mutations.md"

- task: "Writing or modifying tests — scene specs, DSL commands, actors, test IDs, runtime checks"
  load: "docs/testing.md"

- task: "Styling beyond copying an adjacent pattern — oklch color axes, semantic tokens, button variants, Base UI data attributes"
  load: "docs/styling.md"

- task: "Changing database schema, migrations, seeds, or RLS"
  load: "docs/database.md"

- task: "Deciding whether a PR targets main or next-<version>; cutting a release; version bumps; production builds"
  load: "docs/deployment.md"

## Commands

```bash
pnpm install
cp .env.example .env    # populate from supabase outputs
supabase start          # requires Docker Desktop + Supabase CLI
supabase db reset       # apply migrations + seeds

pnpm dev                # dev server at http://127.0.0.1:5173
pnpm check              # typecheck
pnpm lint               # oxlint then eslint
pnpm format             # oxfmt for TS/JS/CSS/MD/JSON; prettier only for SQL
pnpm scene [file]       # run scenetest specs (needs dev server + supabase running)

pnpm run migrate        # create migration from local changes
pnpm run types          # regenerate supabase TS types
pnpm run seeds:schema   # regenerate base.sql — review the diff carefully
```

## Hard rules

- **Migrations only reach `main` via a `next-<version>` → `main` release merge.** Two questions before opening a PR: (1) branch created from `next-<version>`? → PR into it, no matter what you touched. (2) PR touches a migration file? → PR into it. Otherwise → `main`. Full strategy: `docs/deployment.md`.
- **Never `vite build` without a populated `.env`.** Missing `VITE_SUPABASE_*` vars don't fail the build — they silently tree-shake the entire Supabase SDK (~640 KB) out of the bundle. Dummy-but-truthy values are fine; sanity-check with `grep -l GoTrueClient dist/assets/*.js`. Details: `docs/deployment.md`.
- **`collection.utils.refetch()` is a full-table fetch.** Treat it like `useEffect`: a smell needing justification. Prefer `.select()` on the write / RPCs that return rows + `writeInsert`/`writeUpdate`/`writeDelete`. If you're about to add one, stop and check with the human first.
- **New tests are scenetest markdown scenes** (`scenetest/scenes/*.spec.md`), never new `@playwright/test` specs — `e2e/` is deprecated (`transform` label). Navigate by clicking, not by reloading (`openTo` is for the entry point only).
- **Format with oxfmt, never prettier** on TS/JS/CSS/MD/JSON (`npx oxfmt path/to/file.ts`); prettier is for SQL only. Tabs, not spaces. The pre-commit hook formats staged files automatically.
- **Base UI, not Radix** for primitives: selected tabs get `data-active` (style with `data-[active]:`), not `data-state="active"`. Verify attribute names in `node_modules/@base-ui/react/esm/` types.
- **Avoid `dark:` prefixes and opacity tints** (`bg-primary/10`) — the oklch color system auto-flips; use luminance steps (`bg-1-mlo-primary`). Full system: `docs/styling.md`.

## Architecture

Sunlo is a language-learning app: FSRS spaced-repetition flashcards, social features (friends, chat), user-generated phrases/playlists/translation requests, and an activity feed.

**Stack**: React 19 + TypeScript + Vite + React Compiler · TanStack Router (file-based) · TanStack DB collections + TanStack Query · Supabase (Postgres/Auth/Realtime/Storage/RPC) · Zod · react-hook-form + zodResolver · ShadCN UI + Tailwind with `@container` queries · PNPM.

**Philosophy**: local-first (optimistic collection writes, live queries over postgres views, RPCs return full objects); RLS-backed privacy (worst case is a broken UI, never leaked data); container queries keep components portable.

**Data flow**: Supabase → collections (`src/features/<domain>/collections.ts`, Zod-validated) → live queries (`useLiveQuery`) → components. Collections fetch base tables only; joins and filtering happen in live queries. Public collections use `startSync: true`; user collections use `startSync: false`, rely on RLS to scope the fetch, and are cleared on logout. Routes preload with `collection.preload()` — `await Promise.all([...])` when the route needs data at first render, `void` for fire-and-forget background loads.

**Mutations**: persistence lives on the collection (`onInsert/onUpdate/onDelete`); components call `collection.insert/update/delete` and wire toasts to `tx.isPersisted.promise`. Throwing from the handler rolls back the optimistic state; return `{ refetch: false }` when the optimistic value already matches the server. The old `useMutation` + manual `writeInsert`-in-`onSuccess` pattern is deprecated (`transform` label). Worked examples and exceptions: `docs/mutations.md`.

## Feature Modules (`src/features/`)

Deep-module architecture: each domain owns `schemas.ts`, `collections.ts`, `hooks.ts`, and a barrel `index.ts` (some add `live.ts`, `mutations.ts`, `store.ts`, `fsrs.ts`). Modules are deliberately wide where concepts are inseparable — `requests/` holds requests + comments + comment→phrase links + upvotes because a comment without a request is meaningless; don't split a wide module to satisfy a lint rule.

| Domain      | Schemas                                                   | Collections                                             | Key Hooks                                                          |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| `profile`   | PublicProfile, MyProfile, LanguageKnown                   | publicProfiles, myProfile                               | useAuth, useProfile                                                |
| `languages` | Language, LangTag, LangSchema                             | languages, langTags                                     | useLanguageMeta, useLanguageTags                                   |
| `phrases`   | PhraseFull, Translation, PhraseSearch                     | phrases, phrasesFull (live)                             | useLanguagePhrases, usePhrase                                      |
| `deck`      | DeckMeta, CardMeta                                        | decks, cards                                            | useDeckMeta, useDeckCards, useDeckPids                             |
| `review`    | CardReview, DailyReviewState                              | cardReviews, reviewDays                                 | useReviewsToday, useReviewMutation                                 |
| `requests`  | PhraseRequest, RequestComment, CommentPhraseLink, upvotes | phraseRequests, comments, commentPhraseLinks, upvotes   | useRequest, useRequestCounts, useOneComment, useCommentPhraseLinks |
| `social`    | FriendSummary, ChatMessage                                | friendSummaries, chatMessages, relationsFull (live)     | useRelationFriends, useAllChats                                    |
| `playlists` | PhrasePlaylist, PlaylistPhraseLink                        | phrasePlaylists, playlistPhraseLinks                    | useOnePlaylist, useLangPlaylists                                   |
| `feed`      | FeedActivity                                              | (uses React Query — the one `useInfiniteQuery` feature) | useFeedLang                                                        |

**Imports**: consumer code (routes, components) imports from the barrel (`@/features/deck`); cross-domain wiring imports specific files (`@/features/deck/collections`); intra-feature imports are relative (`./schemas`). Always use the `@/` alias otherwise.

**Cross-domain hooks** (`src/hooks/`): `usePhrase()` (composite-phrase — full phrase split by known languages), `useCompositePids()` (recommended phrases + pid arrays), `useSmartSearch()` (trigram search RPC), `useLinks()` (nav routes + badges), `useDebounce`/`usePrevious`/`useIntersectionObserver`, `useFontPreference()`, `useIntro()` (localStorage intro-dialog state), `useIsMobile()`, `useRequireAuth()`.

**Cross-cutting lib** (`src/lib/`): `supabase-client.ts`, `query-client.ts`, `use-auth.ts` (AuthProvider — clears user collections on sign-out, preloads profile on sign-in), `collections/clear-user.ts`, `dayjs.ts`, `utils.ts`, `languages.ts`.

## Routing (`src/routes/`)

TanStack Router, file-based: `_auth` = auth layout, `_user` = protected layout (auth required), `$lang` = dynamic 3-letter language code, dot notation nests paths (`$lang.review.go.tsx` → `/learn/$lang/review/go`), `.lazy` = lazy-loaded, `.index` = index route, `-`-prefixed files = co-located non-route components.

Route context carries `{ auth, queryClient, titleBar?, appnav?, contextMenu? }` — use `beforeLoad`/`loader` to set page metadata, navbar title/icons, and nav links. Access auth via `Route.useRouteContext()` → `auth.isAuth, auth.userId, auth.userEmail, auth.userRole`.

## Conventions

- **Naming**: camelCase variables; PascalCase Zod schemas (`PhraseFullSchema`) inferring types with a `Type` suffix (`PhraseFullType`); snake_case DB fields; PascalCase components in kebab-case files; `lang` for 3-letter codes, `pid` for phrase ids; type-only files use `.d.ts`.
- **Types**: prefer `Array<SomeType>` over `SomeType[]`; ids are `uuid` (string alias in `src/types/main.ts`); generated DB types in `src/types/supabase.ts`.
- **`getKey` must return the row's real unique id.** Most collections use `item.id`; exceptions: decks → `item.lang`, profiles → `item.uid`, upvotes → the foreign key, reviewDays/friendSummaries → composite strings. Check the source table's unique constraint.
- **Query keys** mirror collection ids (`['public', 'phrase_full']`).
- **Dates**: `todayString()` uses a 4am cutoff (not midnight); `ago()` and friends from `@/lib/dayjs`.
- **UI**: always use the generic components (`<Input>`, `<Textarea>`, `<Button>`); toasts via `toastSuccess()`/`toastError()` from `@/components/ui/sonner`; `cn()` for conditional classes; `start`/`end` not `left`/`right` (RTL); `rounded-2xl` for interactive elements, `rounded` for cards; standard Tailwind classes over arbitrary values. oklch shorthand is `{prop}-{L}-{C}-{H}` (e.g. `bg-1-mlo-primary`) — full system and button-variant roles in `docs/styling.md`.
- **DB**: singular table names, uuid primary keys, `created_at timestamptz default now()`, RLS on every `uid` table — never expose one without it. Workflow and seed conventions in `docs/database.md`.
- **Test selectors**: use semantic `data-testid`s (`affirm-community-norms-button`), `data-key` for list items; register new ids in `scenetest/TEST_IDS.md`.
- **Realtime**: subscribe in `useEffect`, parse the payload with the Zod schema, and `writeInsert` into the collection (see `docs/mutations.md`).
- **Other libs**: zustand v5 (review store), dayjs, recharts, sonner, lucide-react, @uidotdev/usehooks.
