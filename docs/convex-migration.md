# Convex Migration Plan

Status: **draft — awaiting decisions on the four open questions in §2.**

This document plans a full migration of Sunlo from Supabase
(Postgres + PostgREST + Auth + Realtime + Storage + Edge Functions) to
[Convex](https://convex.dev). It inventories everything the app currently
gets from Postgres, maps each piece to its Convex equivalent, is explicit
about what has no equivalent and gets lost, and lays out a phased execution
plan.

---

## 1. What we're migrating — inventory

A survey of `supabase/` and `src/` as of this branch:

| Surface           | Count / detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrations        | 120 SQL files                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Tables            | 29 — `phrase`, `phrase_translation`, `phrase_tag`, `tag`, `phrase_relation`, `user_profile`, `user_deck`, `user_card`, `user_card_review`, `user_deck_review_state`, `phrase_request`, `request_comment`, `comment_phrase_link`, 3× upvote tables, `phrase_playlist`, `playlist_phrase_link`, `friend_request_action`, `chat_message`, `notification`, `language`, `search_corpus`, `user_client_event`, `admin_user`, `db_meta`, legacy `message`/`message_tag`/`message_tag_link` |
| Views             | 9 — `feed_activities`, `friend_summary`, `meta_language`, `phrase_meta`, `phrase_stats`, `public_profile`, `search_text_index`, `user_card_plus`, `user_deck_plus`                                                                                                                                                                                                                                                                                                                  |
| SQL functions     | ~45 — FSRS scheduler (plv8, 16 migrations), review insert/update RPCs, `create_comment_with_phrases`, `create_playlist_with_links`, `bulk_add_phrases`, `add_phrase_translation_card`, `fulfill_phrase_request`, upvote setters, friend-request validation, notification triggers, timestamp/count maintenance                                                                                                                                                                      |
| Triggers          | 20 — notifications (`trg_notify_on_*`), upvote count denormalization, `updated_at` maintenance, auto-upvote-own-request, friend-request validation, search-corpus refresh via pg_net                                                                                                                                                                                                                                                                                                |
| Edge functions    | 2 Deno — `search` (query embedding via Cloudflare Workers AI BGE-M3 + `search_by_query`/`search_by_anchors`), `embed-corpus-row` (trigger-driven embedding upsert into `search_corpus`)                                                                                                                                                                                                                                                                                             |
| Extensions        | plv8 (FSRS), pgvector (semantic search), pg_trgm (fuzzy search), pg_net (async trigger → edge function), pg_cron (recounts)                                                                                                                                                                                                                                                                                                                                                         |
| Auth              | Supabase Auth: email/password signup, password login, reset-password email flow. No OAuth providers in use.                                                                                                                                                                                                                                                                                                                                                                         |
| Storage           | One bucket (`avatars`) with RLS policies; client uses `getPublicUrl(path, { transform })` — Supabase image transforms                                                                                                                                                                                                                                                                                                                                                               |
| Realtime          | 3 channels: `user-notifications`, `user-chats`, `friend-request-action-realtime`                                                                                                                                                                                                                                                                                                                                                                                                    |
| RLS               | Every `uid` table; the app's stated privacy model ("worst case is a broken UI, never leaked data")                                                                                                                                                                                                                                                                                                                                                                                  |
| Client data layer | 9 `collections.ts` files (TanStack DB `queryCollectionOptions` over PostgREST), live queries everywhere, optimistic mutations in collection handlers; feed uses `useInfiniteQuery` directly; chat search is a zustand prototype                                                                                                                                                                                                                                                     |

One important de-risking fact: **the client already has a TypeScript port of
the plv8 FSRS scheduler** (`src/features/review/fsrs.ts`) with parity tests
(`fsrs.parity.test.ts`). The scariest-looking server logic is already
written in the language Convex runs.

---

## 2. Open decisions (keep vs. lose)

These four decisions change the shape of the plan. Each has a
recommendation; the rest of this document assumes the recommended option
and calls out where a different answer changes the work.

### Q1 — Frontend data layer: keep TanStack DB or go native Convex?

Today every domain flows Supabase → TanStack DB collection → `useLiveQuery`
→ components, with optimistic writes in collection `onInsert/onUpdate/onDelete`
handlers. Convex has its own reactive client (`convex/react`'s
`useQuery`/`useMutation` with built-in subscriptions and optimistic updates).

| Option                                | What it means                                                                                                                                                                                                                                                                                                                                                                                                    | Churn                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **A. Keep TanStack DB (recommended)** | Back each collection with Convex instead of PostgREST: `queryCollectionOptions` wrapping `convexQuery(...)` from `@convex-dev/react-query` (Convex's live-updating TanStack Query bindings), so every collection becomes realtime for free; mutation handlers call Convex mutations instead of `supabase.from(...)`. Live queries, joins, components, and `docs/mutations.md` patterns survive nearly untouched. | Low–medium: 9 collections files + mutation handlers; components mostly untouched |
| B. Native Convex hooks                | Delete the collections layer; rewrite every consumer to `useQuery(api...)` + Convex optimistic updates. More idiomatic Convex, one less abstraction.                                                                                                                                                                                                                                                             | High: touches every component that calls `useLiveQuery` or `collection.insert`   |
| C. Hybrid                             | TanStack DB for the big synced domains (phrases, decks, cards, reviews); native Convex hooks for server-shaped features (feed pagination, search, chat).                                                                                                                                                                                                                                                         | Medium; two paradigms coexist permanently                                        |

Note for option A: verify current state of the TanStack DB ↔ Convex adapter
story at implementation time — if a first-party Convex collection adapter for
TanStack DB has shipped, prefer it over the `queryCollectionOptions +
convexQuery` bridge; otherwise the bridge works today and a thin custom sync
adapter over `client.onUpdate` is a fallback.

**Decision: _open_**

### Q2 — Auth: what replaces Supabase Auth, and do existing accounts survive?

Flows in use: email/password signup, password login, forgot-password email.
Route context reads `auth.isAuth / userId / userEmail / userRole`;
`admin_user` table + `is_admin()` drive the role.

| Option                                       | What it means                                                                                                                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Convex Auth, keep users (recommended)** | First-party, free, credentials live in your Convex deployment. Export `auth.users` from Supabase; bcrypt hashes can be imported so existing passwords keep working. Email delivery (reset flow) needs a provider (Resend etc.) wired to Convex Auth. |
| B. Better Auth + Convex, keep users          | Open-source auth framework with an official Convex component (`labs.convex.dev/better-auth`). More flexible than Convex Auth (org/2FA/OAuth plugins later), slightly more setup. Password import supported.                                          |
| C. Clerk, keep users                         | Managed provider, polished UI, hash import supported. Adds a paid third-party dependency and an external user store.                                                                                                                                 |
| D. Any of the above, fresh accounts          | Skip credential export; users get a one-time "set a new password" email or re-register. Only acceptable if the active user base is small.                                                                                                            |

**Decision: _open_** (provider × whether credentials must survive)

### Q3 — Production data: how much history survives the cutover?

| Option                                            | What it means                                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Everything, one-shot cutover (recommended)** | Full ETL: profiles, decks, cards, complete review history (FSRS state), phrases/translations/tags, requests, comments, upvotes, playlists, friendships, chat history, notifications, avatars files. Short maintenance window (read-only mode → export → import → DNS/deploy flip). |
| B. Everything, zero-downtime                      | Same fidelity plus dual-write or change-capture while both backends run. Much more machinery; only worth it with real always-on traffic.                                                                                                                                           |
| C. Core learning data only                        | Profiles, decks, cards, reviews, phrases. Drop chat history, notifications, feed backfill, client events. Smaller ETL, users lose social history.                                                                                                                                  |
| D. Fresh start                                    | No production ETL; port seeds for dev. Plan becomes purely a code migration.                                                                                                                                                                                                       |

**Decision: _open_**

### Q4 — Search: what survives of the Postgres search stack?

Today: `search_by_trigram` (pg_trgm fuzzy), semantic search
(`search_corpus` pgvector table + Cloudflare Workers AI BGE-M3 embeddings via
two edge functions), client-side local search, and a hybrid merger
(`use-hybrid-search` / `use-merged-search`).

| Option                         | What it means                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Port both (recommended)** | Semantic → Convex vector search: `searchCorpus` table with a vector index; a Convex action calls the same Cloudflare Workers AI endpoint for embeddings (replaces both edge functions); corpus sync becomes ordinary code in the mutations that touch phrases/requests/playlists (replaces pg_net triggers). Trigram → Convex full-text search index as the typed-query path; keep client-side local search for fuzzy recall. Hybrid merger survives with two sources swapped. |
| B. Semantic only               | Drop the trigram path; full-text + local search cover typed queries. Loses some fuzzy recall on misspellings.                                                                                                                                                                                                                                                                                                                                                                  |
| C. Full-text only              | Drop embeddings too. No Cloudflare dependency, cheapest, biggest capability loss (no "similar phrases" / anchor search).                                                                                                                                                                                                                                                                                                                                                       |
| D. External search service     | Typesense/Meilisearch synced from Convex. Best fuzzy + semantic quality, one more service to run.                                                                                                                                                                                                                                                                                                                                                                              |

**Decision: _open_**

---

## 3. Target architecture

```
React 19 + TanStack Router (unchanged)
        │
TanStack DB collections (Q1-A: kept, now Convex-backed)   ← useLiveQuery unchanged
        │
convex/react client ── WebSocket, reactive by default
        │
Convex deployment
  ├─ schema.ts            ← replaces 120 SQL migrations (declarative, pushed on deploy)
  ├─ queries/*            ← replace PostgREST selects + all 9 views
  ├─ mutations/*          ← replace RPCs + triggers (same transaction, plain TS)
  ├─ actions/*            ← replace edge functions (embeddings, email)
  ├─ crons.ts             ← replaces pg_cron
  ├─ file storage         ← replaces avatars bucket
  └─ auth (Q2)            ← replaces Supabase Auth
```

Convex properties we lean on:

- **Queries are reactive subscriptions.** Every `useQuery`/`convexQuery`
  result live-updates. The three Realtime channels, `refetchOnMount`, and the
  entire `collection.utils.refetch()` smell disappear as a category.
- **Mutations are ACID transactions in TypeScript.** Everything a Postgres
  trigger did (upvote counts, notifications, timestamps, validation) moves
  into the mutation that causes it — same transaction, but visible, typed,
  and testable.
- **No RLS — auth is code.** Every query/mutation begins with
  `ctx.auth.getUserIdentity()` and explicit filtering. See §5 for how we keep
  the "never leak data" guarantee.

## 4. Schema mapping

- One Convex table per current base table (29 → ~25; drop legacy
  `message`/`message_tag`/`message_tag_link` and `db_meta`; `search_corpus`
  becomes a Convex table with a vector index; `user_client_event` kept or
  dropped per Q3).
- **IDs**: Convex generates its own `_id`. Existing UUIDs are preserved in an
  indexed field (e.g. `legacyId`) during ETL so cross-references and any
  external links keep resolving; new rows use Convex ids. `pid`/`uid`
  naming survives at the app layer via the Zod schemas.
- **Zod schemas stay.** `src/features/*/schemas.ts` remain the app-side
  contract; `convex/schema.ts` validators are generated to match them
  (convex-helpers has zod interop). This keeps the collections layer and
  runtime validation identical.
- **Indexes** replace the implicit ones: by-lang, by-uid, by-uid-and-lang,
  composite link-table keys — Convex requires explicit `.index()` per access
  path, which we enumerate from existing query patterns.
- **Views become queries** (§5). Views were read-time joins; TanStack DB
  live queries already do most of the joining client-side, so several views
  (`user_card_plus`, `user_deck_plus`, `friend_summary`) shrink to plain
  indexed reads. Aggregation views (`phrase_stats`, `meta_language`,
  `feed_activities`) become paginated/aggregating Convex queries.

## 5. Server logic mapping

| Today                                                                                                                                                             | Becomes                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plv8 FSRS (`record_review_and_schedule`, `insert/update_user_card_review`)                                                                                        | Convex mutations importing the existing `fsrs.ts` port; parity tests already exist and run against both                                                                                                                                                                                                   |
| `create_comment_with_phrases`, `create_playlist_with_links`, `bulk_add_phrases`, `add_phrase_translation_card`, `fulfill_phrase_request`, `create_orphan_message` | One Convex mutation each — multi-row inserts in one transaction, returning the full objects (matches the existing "RPCs return rows" philosophy)                                                                                                                                                          |
| Upvote setter RPCs + count-maintenance triggers                                                                                                                   | One mutation per entity that writes the upvote row **and** bumps the denormalized count in the same transaction; `recount_all_upvotes` + pg_cron → an internal mutation on a Convex cron                                                                                                                  |
| `trg_notify_on_*` notification triggers                                                                                                                           | Notification inserts inside the source mutations (comment, translation, upvote, phrase-reference)                                                                                                                                                                                                         |
| `validate_friend_request_action` trigger                                                                                                                          | Validation at the top of the friend-request mutation                                                                                                                                                                                                                                                      |
| `updated_at` triggers                                                                                                                                             | Explicit `patch({ updatedAt: Date.now() })` in mutations (or a small helper)                                                                                                                                                                                                                              |
| `is_admin()` / `are_friends()`                                                                                                                                    | Shared helper functions in `convex/lib/` used by queries and mutations                                                                                                                                                                                                                                    |
| RLS                                                                                                                                                               | A required auth helper (`requireUser(ctx)`) + per-table access helpers, enforced by convention and a lint/test gate: every public query/mutation must call one. The guarantee weakens from database-enforced to code-enforced — this is the single biggest safety-model change in the migration (see §10) |

## 6. Auth (per Q2)

- Replace `src/lib/use-auth.ts` + `auth-lifecycle.ts` internals; the
  `{ auth }` router-context shape (`isAuth/userId/userEmail/userRole`) is
  preserved so routes don't change.
- `admin_user` table → role field on the users/profile table checked by
  helpers.
- Signup, login, forgot-password routes swap SDK calls; email delivery via
  Resend (or provider of choice) from a Convex action.
- If keeping users: export `auth.users` (id, email, bcrypt hash,
  email_confirmed_at), import via the chosen provider's migration path, and
  map `auth.users.id` → profile `legacyId`.

## 7. Search (per Q4), storage, realtime, feed

- **Search**: per Q4-A — `searchCorpus` Convex table + vector index;
  embedding action calling Cloudflare Workers AI (same BGE-M3 model, env
  vars move to Convex); corpus upserts scheduled from the phrase/request/
  playlist mutations via `ctx.scheduler.runAfter(0, ...)` (same eventual-
  consistency shape as today's pg_net triggers); full-text index for typed
  search; `use-semantic-search` / `use-trigram-search` / `use-hybrid-search`
  keep their interfaces with swapped internals.
- **Storage**: avatars → Convex file storage; upload flow returns a storage
  id stored on the profile. **Supabase image transforms are lost** — replace
  with client-side resize before upload (avatars only need one small size)
  or an image CDN later.
- **Realtime**: delete `useSocialRealtime`, notification channel wiring, and
  the Zod-parse-payload-then-`writeInsert` pattern — Convex-backed queries
  are live already. `docs/mutations.md` realtime section gets rewritten.
- **Feed**: `feed_activities` view + `useInfiniteQuery` → a Convex paginated
  query (`usePaginatedQuery` or infinite-query options from
  `@convex-dev/react-query`), with the same cursor-by-`created_at` shape.

## 8. Data migration (per Q3)

1. Freeze: put prod in read-only (feature flag / maintenance banner).
2. Export: `pg_dump --data-only` per table → JSONL (script in `scripts/`).
3. Transform: UUID → `legacyId`, FK UUIDs → looked-up Convex ids
   (two-pass: insert parents, build id-map, rewrite children), timestamps →
   epoch ms, storage paths → re-uploaded Convex file ids.
4. Import: `npx convex import` per table (or an import mutation for tables
   needing lookups).
5. Verify: row counts + spot checks + FSRS-state parity sample.
6. Cut over: deploy the Convex build, auth users land via Q2 path.
7. Keep the Supabase project paused-but-intact for a rollback window.

## 9. Testing & dev workflow

- **scenetest scenes are backend-agnostic** (they drive the UI) — the suite
  is the migration's acceptance gate and mostly survives untouched. The DSL's
  seed/reset hooks move from `supabase db reset` to a Convex seed script
  (`npx convex run seed` against a local deployment / `convex dev` backend).
- Unit tests: `fsrs.parity.test.ts` gains a third target (the Convex
  mutation via `convex-test`).
- Dev loop: `supabase start`/`db reset` → `npx convex dev` (+ seed);
  `pnpm run types` (supabase codegen) → deleted, Convex generates types
  automatically; `.env` → `VITE_CONVEX_URL` (and the tree-shaking build
  footgun in `docs/deployment.md` dies with `VITE_SUPABASE_*`).
- Docs to rewrite: `docs/database.md`, `docs/mutations.md`,
  `docs/deployment.md` (the whole `next-<version>` migration-branch strategy
  exists because SQL migrations are dangerous; Convex schema push removes
  most of its reason to exist), `CLAUDE.md` hard rules.

## 10. What you lose / what you gain

**Lost, with no real equivalent:**

- **SQL.** No psql, no ad-hoc joins/aggregations against prod, no SQL-based
  analytics on `user_client_event`. (Convex offers streaming export to a
  warehouse if this matters later.)
- **RLS as a backstop.** Access control becomes code-enforced convention;
  a forgotten filter is a data leak, not a broken UI.
- **pg_trgm fuzzy matching** (Q4): Convex full-text is prefix/word-based.
- **Supabase image transforms** on avatars.
- **Postgres portability/self-host maturity**: Convex is open-source but
  realistically you're on their cloud; pricing is per-function-call/storage
  rather than per-instance.
- The 120-migration history (kept in git, but no longer the source of truth).

**Gained:**

- Realtime everywhere by default; the entire refetch/invalidation category
  of bugs and the `refetch()` hard rule disappear.
- All server logic in typed TypeScript, in one language with the client,
  transactional, unit-testable (`convex-test`) — no more plv8, triggers, or
  `pnpm run types` codegen.
- End-to-end type safety from schema to component without a generation step.
- Scheduled functions, crons, and actions replace pg_cron/pg_net/Deno
  functions with one deployment model.
- Deploy simplification: schema and functions ship atomically with the
  frontend build; the migration-branch release choreography goes away.

## 11. Phased execution

Each phase lands as a PR on a long-lived `convex-migration` integration
branch; scenetest green is the gate for each.

1. **Foundations** — Convex project, `convex/schema.ts` (all tables +
   indexes), auth provider wired, `requireUser` helpers, seed script, CI.
2. **Read path** — Convex queries for every collection + the 9 views'
   logic; collections swap to Convex-backed options (Q1); routes preload
   unchanged. App boots read-only against seeded Convex.
3. **Write path** — mutations for every RPC + trigger behavior (upvotes,
   notifications, friend requests, comments/playlists/phrases, chat);
   optimistic handlers rewired; realtime channels deleted.
4. **Review/FSRS** — review mutations using the existing TS port; deck
   review state; parity tests against recorded plv8 fixtures.
5. **Search & storage** — corpus table, embedding action, search queries,
   avatar storage + upload resize.
6. **ETL & cutover** — export/transform/import scripts, dry-run against a
   prod snapshot, verification, maintenance-window cutover (Q3).
7. **Demolition** — remove `@supabase/*`, `supabase/`, dead docs; rewrite
   `docs/database.md`/`mutations.md`/`deployment.md`; update `CLAUDE.md`.

Rough shape: phases 1–2 are the wide-but-shallow bulk; phase 3 is the most
detail-heavy (every trigger behavior must be consciously re-homed); 4–5 are
contained; 6 is scripting plus care.

## 12. Risks

- **Silent authorization gaps** (RLS → code): mitigate with the required
  helper pattern, a test that walks every exported query/mutation, and a
  scenetest actor-isolation scene (user B cannot see user A's data).
- **Convex query limits**: queries scan ≤ a few thousand docs comfortably —
  aggregation views (`phrase_stats`, `meta_language`, feed) must be
  denormalized counters or paginated, not full scans; this is design work in
  phase 2, flagged per view.
- **ETL id rewriting** is the classic long-tail: two-pass import with strict
  Zod validation on every transformed row, and a dry run on a full prod
  snapshot before the real window.
- **Adapter maturity** (Q1-A): the TanStack Query bridge is beta; fallback
  is a thin custom collection sync adapter (~100 lines) over the Convex
  client's subscription API.
