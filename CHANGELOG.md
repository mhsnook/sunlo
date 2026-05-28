# Change Log

## v0.27 - Admin Tag Editor, Auth Lifecycle, Playwright → Scenetest

_28 May, 2026_

### Features

- **Admin tag editor for request messages.** Tags attach to the cross-language `message` behind each request, not the request itself — so they'll travel with every language variant once cross-posting lands. New `/admin/messages` consolidates bulk-add, filter, multi-select tagging, and tag CRUD (with archive/restore). Per-request admin page gains the same inline editor plus sibling-requests and attached-phrases lists. `/learn` shows read-only chips + a gear for admins.
- **Per-deck navigation gates** — `$lang` appnav hides until the user has an active deck; new `chromeless` route flag drops the top navbar for full-screen pages.
- **Card status dropdown** simplified; deck setup deferred to a dedicated dialog (#693).
- **Login error messaging** for invalid credentials (#680).

### Improvements

- **Auth lifecycle consolidated** into a single `authLifecycle` class (#694). Profile collection became identity-aware; user collections re-sync correctly across identity changes.
- **Vendor bundle splitting** (#686) — separate `lucide-vendor`, `react-vendor`, `supabase-vendor` chunks stay cached across deploys.
- Admin pages render inside a `bg-card/50` surface; appnav consistently shows Phrases / Requests / Messages.

### Migrations

- `20260526120000_request_messages_and_tags.sql` — adds `message`, `message_tag`, `message_tag_link`; `phrase_request.message_id` (auto-filled by a SECURITY DEFINER column DEFAULT); seeds nine starter tags.
- `20260527120000_archive_message_tags.sql` — adds `message_tag.archived` for soft-delete.

### CI / DX

- **Playwright → Scenetest cutover** in flight: legacy npm test scripts and `nav-tests` CI job removed; new scenetest coverage for feed, playlists, bulk-add, password-reset, cards, and admin messages.
- `should()` runtime assertions back the deck mutations and collection handlers; `serverCheck` replaced by `.select()`-then-`should()` or removed where dead.
- **Bundle scan** in CI catches dev-only code leaking into production builds.
- `install:st` / `uninstall:st` scripts for local scenetest-js dev.

## v0.26 - Auto-provisioned Profiles, Optimistic Mutations, Navigation Refresh

_21 May, 2026_

### Features

- **Auto-provisioned user profiles** — a Postgres trigger (`handle_new_user`) creates a `user_profile` row for every confirmed auth user, so profile existence now tracks "is this a user at all" rather than "has onboarding finished". The old `/getting-started` hard redirect is gone: onboarding is a soft, dismissible sidebar nudge driven by a new `flags` jsonb column (`needs-onboarding`). This eliminates the issue #134 RLS-violation race by design — there is no client-side profile _creation_ anymore, only updates. `/getting-started` runs in focus mode and updates the pre-existing row; the `_user` loader fails loudly if a confirmed user is somehow missing a profile.
- **Navigation reorganized around top-level sections** — the sidebar moves the user nav into the content area with a dedicated footer-actions row, and the search overlay is hoisted into the `_user` layout, opened via `staticData.search` so any route can opt in.
- **`/admin/routes` introspection page** — a lazy-loaded admin view listing the app's route tree.
- **`/themes` workshop** — a Typography Lab for comparing fonts, plus a component showcase that previews UI components against a mock language.

### Improvements

- **Optimistic mutations across the app** — comments, upvotes, card-status changes, the request form + delete dialog, deck settings, and profile preferences all moved from `useMutation` + manual sync to the collection-config (`onInsert/onUpdate/onDelete`) and `createOptimisticAction` patterns. Upvote actions no longer refetch whole tables. The pattern is codified in `CLAUDE.md`.
- **localStorage sidecar cache** — the profile and decks collections are mirrored to localStorage and restored into the query cache before React renders, so they paint on the first frame after a reload instead of waiting for the network. Supabase stays the source of truth and overwrites the cache on revalidation.
- **Per-language OKLCH hue palette** — replaces the old deck-theme indirection; each language gets a consistent hue from the tailwind-oklch scale, and hardcoded purples are dropped from card/phrase status icons.
- **Atkinson Hyperlegible Next** is now the body font.
- **Softer surfaces** — the default `Callout` variant lightened for a gentler success state; active/hover tints toned down across badges, dropdowns, and ghost buttons.
- **Join indexes** added to the `phrasesFull` and `publicProfilesCollection` live queries.
- Smaller touches — the review-ready banner inlines the language name and uses the (flipped) garlic logo; relative-time permalinks gain a full-timestamp tooltip; request comment counts use a single-comment icon.

### Refactors

- **`features/comments` merged into `features/requests`** — a comment without a request is meaningless, so they are one wide module now.
- Cross-feature phrase joins moved into `phrases/live.ts` using nested `q.from()`; `usePhrasesFromComment` and `useRequestLinksWithComments` joins simplified.
- Route nav/layout config (`titleBar`, `appnav`) moved from `beforeLoad` into `staticData`.
- Chat message metadata streamlined.
- Dead code removed — 5 unused files and 15 unused type aliases.

### Migrations

- `20260520120000_auto_create_user_profile.sql` — adds the `flags` jsonb column to `user_profile`; the `handle_new_user()` function; two `auth.users` triggers (`on_auth_user_confirmed` for email/password confirmation, `on_auth_user_created` for OAuth/magic-link); and a one-time backfill giving existing confirmed-but-profileless users a row.

`seed-zzz.sql` now also refreshes the `meta_language` materialized view at end-of-seed. Like `search_text_index`, its refresh triggers are skipped during replica-mode bulk loading, so fresh installs were left with empty language lists until this.

### Build / Dependencies

- **Vite 8 (Rolldown)** — the build now runs on the Rolldown-powered Vite 8.
- `@supabase/supabase-js` bumped to 2.106; `@tanstack/router` pinned above the GHSA-g7cv-rxg3-hmpx advisory range; dev / non-runtime dependencies refreshed.
- Vercel build command pinned to a production Vite build.

### CI / DX

- **Prod-bundle scan** — CI catches dev-only code leaking into production builds; dev-only UI is gated on local hostname, not build mode alone.
- Scenetest runs against `pnpm dev:local` on port 5173; the cold-start first-spec failure is fixed; `_warmup` renamed to `00-warmup` for explicit sort order.
- Supabase CLI version pinned in CI (setup-cli 404 workaround).
- Lint reporting detects shifted issues; oxlint no longer lints `e2e/`; the lint-staged glob is fixed so JSON-only commits don't fail; assorted lint cleanups.
- Playwright e2e marked deprecated in the testing docs; redundant specs removed.
- Scenetest spec drift fixed (a stale `seeText` after a copy change).
- New `Become-From` skill (renamed from "Initiate Transform").

### Fixes

- Phrase card — placeholder Delete/Edit buttons removed.
- Comments/answers — duplicate toggles replaced with a metadata line + switch; "View in thread" spacing fixed.
- Dialog layout and close-button positioning improved.
- Password-reset form surfaces submit errors instead of silently failing on a doomed submit.
- Generated colors restored for avatar placeholders.

## v0.25 - Auto-sync Search Corpus, Send-to-Friend Recommend, Concurrent-Team Tests

_9 May, 2026_

### Features

- **Auto-sync search corpus** — the corpus now stays current automatically as users edit phrases, translations, requests, and playlists. Two parallel indexes maintained in Postgres: `search_text_index` materialized view (trigram side, refreshed in-transaction by statement-level triggers — always consistent) and `search_corpus` table (embedding side, populated async via `pg_net` → new `embed-corpus-row` edge function → Cloudflare Workers AI). Source writes don't pay Workers AI latency. A `BEFORE UPDATE` guard on `search_corpus` drops out-of-order embed completions at the row level.
- **First-party-only mode** — both edge functions auto-detect missing `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` at boot and adapt. `/search` text queries route through `search_by_trigram` → `search_by_anchors` over the seeded corpus vectors instead of Workers AI. `embed-corpus-row` no-ops the embed-and-upsert path while still running archive/delete cleanup. Local dev without Cloudflare keys, and any first-party-only deployment, get plausible-shaped results without third-party calls.
- **Seeded search corpus** — `supabase/seeds/seed-corpus.sql` ships 422 pre-vectorized rows so fresh installs have a working semantic corpus on `supabase db reset` without running the backfill.
- **Send-to-friend recommend dialog** — the recommend-to-friend flow uses the smart-search stack (semantic + trigram + local) for picking phrases.
- **Floating dev-only identity switcher** — quick actor swap in dev for testing multi-user flows without re-login.

### Improvements

- **`vectorized_at` staleness tracking** — `search_corpus.vectorized_at` is set to `source.updated_at` on every embed upsert. The backfill's `--skip-existing` now means _skip-if-fresh_: compares timestamps and re-embeds only new or stale rows. Recovers from missed embed dispatches without re-burning credits on already-fresh rows.
- **Idempotent seeds and dump scripts** — seeds + `dump-new-seeds.ts` can run repeatedly without errors.
- **Concurrent-team test data** — second-team seeds and scenetest support so multi-user flows can exercise concurrent independent teams.

### Refactors

- **`search` edge function decomposition** — `getOrEmbed` → `tryGetEmbedding` returning `number[] | null`, with `searchViaTrigramAnchor` as the no-Workers-AI path. The corpus-vector cache now does double duty as exact-match query embedding source.

### Migrations

- `20260507130000_search_corpus_auto_sync.sql` — adds `phrase.updated_at` + bump trigger; promotes `search_corpus`'s natural key `(source_type, source_id)` to PK and drops the unused synthetic `id`; adds `vectorized_at` + a stale-write guard; creates `search_text_index` materialized view + statement-level refresh triggers across `phrase`, `phrase_translation`, `phrase_request`, `phrase_playlist`, `phrase_tag`; updates `search_by_trigram` to query the MV; configures `pg_net` + per-row triggers that dispatch to `embed-corpus-row`. `seed-zzz.sql` refreshes the MV at end-of-seed (seed loaders set `session_replication_role = replica`, which skips trigger-based MV updates during bulk load).

After applying migrations, the seeded corpus + `seed-zzz.sql` MV refresh covers fresh installs. Re-run `pnpm tsx scripts/backfill-search-corpus.ts` only if the seed corpus is stale or you want fresh embeddings against current source data.

### CI / DX

- **`pnpm exec`** in pre-commit hooks instead of `pnpx`.
- **SQL prettier** expression width loosened from 64 to 120 (less noise on unrelated SQL changes).
- **`dump-new-seeds.ts --corpus-only`** flag for refreshing `seed-corpus.sql` after a backfill.
- **Schema/types regen** with datestamp metadata.
- **Search architecture documented** — new README section with a Mermaid component diagram, two-index comparison table, write/query path descriptions, and a four-mode operating table covering production / local-with-Cloudflare / local-without-Cloudflare / mock-chat.
- **Spec fixes** — scenetest spec drift cleaned up.

## v0.24 - Smart Search, Chat-style Discovery, TanStack Form

_7 May, 2026_

### Features

- **Smart Search** — `/search` now blends semantic (BGE-M3 cosine via Cloudflare Workers AI) and trigram (pg_trgm) signals into a single ranked list across phrases, requests, and playlists. Symmetric `sqrt(x) + sqrt(y)` score formula amplifies low-end matches (typo recovery, inflected forms) without letting them dominate. Lang and tag chips are filters on a text query (the search bar requires text now). Tag names are folded into the searched text so a query like "greeting" surfaces phrases tagged that way even if their text doesn't say it.
- **Chat-style discovery** (`/chats/$lang`) — new conversational phrasebook search. Type in plain English; semantic-only results (no trigram) come back in a chat-like turn-by-turn UI. Tap the **+** on a result to add it to a per-language cart, then "more like these" pivots to a new search using the cart contents as anchors. User-approved normalization with a live suggestion strip ("did you mean…?") feeds the search.
- **`/search/test` diagnostic page** — hidden auth-only route that mirrors `/search` but renders the score breakdown (Ω semantic, Δ trigram, Σ combined) under each result row. For tuning the blending formula by eyeballing real queries.
- **Browse Requests language picker** — clicking a request from a cross-language list intercepts with a language-picker dialog so the request lands in the right deck.
- **TanStack Form migration** — every form across the app moved from react-hook-form to TanStack Form for consistency with the rest of the TanStack stack.

### Improvements

- **Lazy-load `AppSidebar` and `AppNav`** — first paint is faster; the navigation chrome no longer blocks main-bundle parse.
- **Bundle-size diff job in PR CI** — every PR now reports raw + gzipped main-bundle deltas so size regressions are caught before merge.
- **`/search` route lazy-loaded** — the search UI plus all its sub-components ship in a separate chunk, not the main bundle. Diagnostic-only code (`ScoreBreakdown`) lives in the `/search/test` chunk via render-prop injection.
- **Main-bundle code-splitting around contributions routes restored** — was inadvertently broken in a previous refactor.
- **Sibling card burying refined** — when a phrase has both forward and reverse cards eligible, the lower-priority sibling is buried (avoids back-to-back review of the same phrase). First-day exception keeps both siblings of a brand-new pair visible.

### Fixes

- Fix `phrase_meta` view lacking `security_invoker` rule.
- Fix scenetest console errors and timing flakiness in admin phrase table + new-user cleanup.

### Refactors

- **Smart-search architecture** — the previously monolithic `useHybridSearch` hook split into composable primitives: `useSemanticSearch` (Edge Function), `useTrigramSearch` (pg_trgm RPC), `useLocalSearch` (in-memory substring scan). `useHybridSearch` blends the server pair; `useMergedSearch` composes everything into a single ranked list consumed identically by `/search` and `BrowseSearchOverlay` — same ranking guaranteed by construction.
- **`search_corpus` is the single source of truth for both semantic and lexical search** — the old `phrase_search_index` materialized view + `search_phrases_smart` RPC were dropped. New `search_by_trigram` RPC mirrors `search_by_query`'s shape; both run against `search_corpus`.
- **Contributions feature module dissolved** (#583) — split across the relevant feature directories; one less artificial boundary.
- **UI preferences consolidated** into a shared module (#604).
- **`ActionCard` props tightened** with a discriminated union (#608).
- **`SearchEntityType` unified** — was duplicated as `SearchResultType`; lives in `src/hooks/search-config.ts` now.
- **`chatSearchLive` delegates to `runSemanticSearch`** — the chat client and `/search` share the underlying edge-function call without sharing React shape.

### Migrations

- `20260429120000_search_corpus.sql` — denormalized search corpus table with `entity_id` / `entity_type` discriminator, HNSW vector index for semantic, btree on `text_normalized` for the embedding cache.
- `20260506120000_widen_smart_search_lang_filter.sql` — `lang_filter` widens from `text` to `text[]` (matches the semantic RPCs' contract).
- `20260506130000_search_corpus_trigram.sql` — drops `phrase_search_index` + `search_phrases_smart`; adds `gin_trgm_ops` index on `search_corpus.text_normalized` and the new `search_by_trigram` RPC.

After applying migrations, run `pnpm tsx scripts/backfill-search-corpus.ts` to populate the corpus (the script now selects from `phrase_meta` and folds tag names into `text_normalized`).

### CI / DX

- **Scenetest upgraded to v0.9.0** — panel-dupe fix, comments-tab scene added, scene coverage updated for the form migration.
- **`oxfmt` documented as the JS/TS formatter** in CLAUDE.md (prettier remains for SQL).
- **`dev:local` and `build:test` scripts** — set `VITE_CHAT_USE_MOCK=true` so the chat UI runs against canned data without populating the corpus or hitting Workers AI. Useful for scenetest and offline UI work.
- **Comment ownership gating test + seed data** (#588).
- **`MIN_QUERY_LENGTH` and `LOCAL_ONLY_TRIGRAM_SCORE` centralized** in `src/hooks/search-config.ts` (were defined in 4+ places).

## v0.23 - Admin Panel, Learn Page Redesign, Recognise & Recall

_25 April, 2026_

### Features

- **Admin panel** — new `/admin` section for admins: phrase management (list, view, archive per language) and request management per language. Backed by a new `admin_user` table, `is_admin()` function, and admin-scoped RLS policies on phrases and requests. Non-admin users see a 403 guard.
- **Learn page redesign** (#567) — the main `/learn` page has a new layout: prominent review banner for the active language, simpler deck tiles, and an integrated friends feed below.
- **Recognise & Recall labels** — bidirectional card directions are now labelled "Recognise" (💡, forward) and "Recall" (🧠, reverse) throughout the review setup, preview, and session screens. Replaces the previous "front/back" labels with an explainer in the intro dialog.
- **Phrase-level direction breakdown** — review setup now shows a Recognise/Recall split under Scheduled and New Cards headings so you know what kind of review is coming.

### Improvements

- **Review counts are now card-accurate** — setup counts and the preview filter now count by individual card (not phrase), matching exactly what the session will contain. Re-scoring a card within a session no longer wipes the FSRS chain.
- **Interval badges stabilised** — review button interval labels no longer flicker mid-session.
- **Practice-history dialog redesigned** — cleaner layout; card permalink fixed.
- **Supabase connection errors handled gracefully** (#565) — network/DB errors on load show a friendly message instead of a crash.
- **Auth logout hardened** — hard-reload on signOut error to reset stale auth state; use refetch instead of collection clear on logout to avoid race conditions.
- **"Most phrases use both sides" leads the intro** — reordered for clearer first impression.
- **Default font changed to Atkinson Hyperlegible** — replaces Instrument Sans for better readability across sizes.

### Fixes

- Fix misleading "error posting review" toast when the review actually succeeded.
- Fix review preview over-including cards with a reviewed sibling direction.
- Silence Base UI `nativeButton` mismatch warnings.
- Fix dev warnings: add `autoIndex` to public, eagerly-loaded collections.
- Fix seed data: reclassify 9 duplicate phase-1 reviews to phase-3.

### Refactors

- **`phrasesFull` split** — extracted into a public-only collection plus a new `useMyCard` hook; forward/reverse card status invariant now asserted at hook boundary.
- **Query hooks extracted** (#566) — shared live collections and query hooks pulled into reusable modules for better composability.

### CI / DX

- Switch formatter to **oxfmt** (keep prettier for SQL only).
- Scenetest upgraded to **v0.8.2** — panel hidden unless `:ui` is specified; JSON report emitted and posted as a pasteable PR comment on failure; per-scene console errors dropped in favour of a headline total.
- Add lint-diff CI job mirroring the typecheck job.
- Migrate navigation e2e tests to scenetest.
- Add regression scenetest scenes for issues #104, #134, #156, #202.
- Add ts-fsrs parity tests for FSRS-5 reference-vector verification.

### Database

- `admin_user (uid uuid primary key references auth.users)` — new table; `is_admin()` security-definer function; admin RLS policies on `phrase` and `phrase_request`.

---

## v0.22 - 2-Button Review Default & FSRS Fix

_18 April, 2026_

### Changes

- **Default review mode is now 2-buttons** — new profiles get "Try Again / Correct" instead of the 4-button FSRS scale. Existing profiles keep their current setting.

### Fixes

- **Phase-3 FSRS values corrected** (#544) — re-reviews of "Again" cards were being stamped with fresh initial FSRS values instead of mirroring the same-session phase-1 snapshot. Since phase-3 rows are tracking-only and never feed scheduling, they now copy difficulty/stability/retrievability directly from the phase-1 review. Two data-repair scripts (`pnpm recompute-reviews`, `pnpm reclassify-phase1-duplicates`) are included to correct historical rows.

### Database

- `user_profile.review_answer_mode` default changed to `'2-buttons'`.

## v0.21 - Bidirectional Cards

_9 April, 2026_

### Features

- **Bidirectional cards** (issue #310) — each phrase now has two independently-scheduled flashcards: forward (phrase → translation) and reverse (translation → phrase). Phrases marked `only_reverse` skip the forward card entirely. The FSRS spaced-repetition schedule tracks each direction separately.
- **Review preview page** — a new intermediate step between review setup and the session itself shows a breakdown of the upcoming cards (forward vs. reverse counts, new vs. due). Provides a natural confirmation point before committing to a session.

### Improvements

- Phrase picker now shows all phrases when the search field is empty (previously showed nothing until you typed).
- Upvote actions on playlists and requests now show a toast confirmation on success.

### Fixes

- Migration: drop FK constraint before dropping the `uid_card` index to avoid a PostgreSQL dependency error on `supabase db reset`.

### Database

- `card_direction` enum: `'forward' | 'reverse'`
- `user_card.direction card_direction not null default 'forward'` — new column; existing cards become forward.
- `user_card_review.direction card_direction not null default 'forward'` — new column; FK updated to `(uid, phrase_id, direction)`.
- `user_card` unique constraint updated from `(uid, phrase_id)` to `(uid, phrase_id, direction)`.
- `add_phrase_translation_card` RPC updated to insert both forward and reverse cards.
- `user_card_plus` view updated to join on direction.

### Testing

- Upgraded scenetest to v0.5.0 (`ifClick`, `warnIf`, `seeInView`, `setup:` directive, `[team.lang]` interpolation in cleanup/setup expressions).
- Replaced hardcoded `kan` with `[team.lang]` throughout review and bidirectional specs.
- New `bidirectional-review.spec.md` end-to-end scene for the full bidirectional review flow.
- Applied `data-name` + `data-key` convention to list components rendered from database data (comments, feed items, friend chat links, phrase picker items).

## v0.20 - Review Sound Feedback, Phrase Detail Polish

_4 April, 2026_

### Features

- **Review sound + coin feedback** — each score button plays a brief synthesized tone (Web Audio API, no external files) and pops a small color-matched circle above the pressed button Mario-coin style. Again/Hard are quiet and neutral; Good steps up slightly; Easy sparkles with two ascending notes. Tones are generated at runtime: no network, no files, works offline.
- **Sound preference** — On/Off toggle in display preferences previews all four sounds in sequence when switched on, and aborts any in-progress audio immediately when switched off. Preference persisted to `user_profile.sound_enabled` (new column, default on).
- **Related cards on phrase detail** — phrase detail page now shows other cards in the same deck that share vocabulary or context.
- **Phrase links visible in Contributions tab** — comments in the Contributions view now surface their attached phrase links.
- **Review completion on deck card** — the rocket icon becomes a checkmark after completing a review session, giving clearer confirmation on the deck overview.

### Improvements

- **Review answer mode updates on click** — the display preferences toggle for 2-button vs 4-button review now saves immediately on click, matching the font and sound toggles (no submit button).
- Remove green tint from the completed-review button (was visually ambiguous with the Good rating button).

### Fixes

- Fix comment collection "not ready" errors by preloading collections and adding retry logic.
- Remove duplicate search link and route file.

### Database

- `user_profile.sound_enabled boolean not null default true` — new column for sound preference.

_3 April, 2026_

### Features

- **Comment + reply overhaul** — consolidated 6+ comment components into `CommentDialog` and `ReplyDialog`; reply thread UX improvements (focus stays on close, cleaner reply prompt); edit comment form now has full parity with new-comment (markdown hints, flashcard support)
- **URL-driven answering** — new `AnsweringDialog` opens from a URL param on request threads, with a dedicated "Flashcard" button to initiate it inline
- **Archived decks** — manage and navigate archived decks from the deck settings area
- **Comments tab in Contributions** — contributions page now includes a Comments tab with a responsive dropdown for tab navigation
- **Manage deck: reviewed today** — "Reviewed today!" badge in the manage deck table; skipped cards are now dimmed and their due dates hidden; `cardsCollection` updates after a review session so the table stays in sync without a reload
- **Wordle-style share button** — share your review results from the review completion screen

### Improvements

- **URL state simplification** — collapsed 7 comment/thread search params into two (`focus` + `mode`), making sharing and bookmarking request threads cleaner
- **Preferred translation language** — deck's `preferred_translation_lang` is now prioritized in review card translation display order; logic moved into `usePhrase` hook
- **Review start buttons** — sticky at the bottom of the viewport so they're always reachable on long warmup lists
- **Font selector** — restored side-by-side layout with per-font preview; added book icons to each option
- **Playlist owner actions** — moved under avatar instead of stacking vertically for a tighter layout
- **MarkdownHint** — exported and reused across comment + edit forms; copy fixes

### CI

- **TypeScript type checking in CI** — `pnpm check` now runs on PRs with inline PR comments for type errors (#500)

### Fixes

- **[Hotfix v0.18.1]** Fix `phrase_search_index` not populated after recreation (caused "CONCURRENTLY cannot be used when not populated" errors on add-phrase)
- Fix blank password causing silent hang on login form
- Fix button default size regression and recommended-phrases grid gap
- Fix invalid UUIDs in seed data (Zod v4 compatibility)
- Fix button text overflow: shorten to "Browse the Feed"
- Fix navbar icon spacing to match app-nav
- Fix TypeScript errors in deck settings (parse Supabase data through Zod schema)
- Fix comment phrase link type inference after TanStack DB update (single-source `useLiveQuery` returns flat types, not `{ alias }` wrappers)
- Fix `AuthenticatedDialogContent` to forward rest props so `data-testid` attributes reach the dialog DOM element
- Fix YAML syntax error in CI workflow
- Upgrade `@base-ui/react` to 1.3.0 (popover/combobox positioning fix)

### Testing

- Add comment CRUD scenetest spec: two scenes covering post, phrase-link attach/remove, and delete for top-level comments and replies

## v0.18.1 - Hotfix: Fix add-phrase error

_1 April, 2026_

- **Fix phrase_search_index** — the v0.18 migration recreated the materialized view with `WITH NO DATA` but never populated it, causing "CONCURRENTLY cannot be used when the materialized view is not populated" errors when adding phrases.

## v0.18 - Notifications, 2-Button Reviews, Auto-Likes, Performance

_1 April, 2026_

7 migrations. 6 new database features. 44 new vitest tests. 5 new scenetest spec files.

### Database Changes (migration track)

- **Notifications center** — new `notification` table with 4 SECURITY DEFINER triggers (`request_commented`, `comment_replied`, `phrase_translated`, `phrase_referenced`). Notifications are created server-side only; users can read their own and mark as read. RLS enforces uid-scoped access with no INSERT/DELETE grants to users.
- **Review answer mode** — new `review_answer_mode` column on both `user_profile` (global default) and `user_deck` (per-deck override). Supports `'2-buttons'` (Again/Good) or `'4-buttons'` (Again/Hard/Good/Easy). Deck setting cascades to profile default when cleared.
- **Auto-like on create** — triggers on `phrase_request`, `request_comment`, and `phrase_playlist` auto-upvote content on creation. Migration backfills existing content. Adds `recount_all_upvotes()` function for daily cron reconciliation.
- **count_learners RLS fix** — `phrase_stats` view now queries `user_card` directly instead of through RLS-filtered views, fixing a bug where `count_learners` was always 0 or 1.
- **Extract phrase_stats** — split `phrase_stats` out of `phrase_meta` into its own view, decoupling downstream views and simplifying the dependency chain.
- **Materialize meta_language** — convert `meta_language` from a live view to a materialized view with automatic refresh triggers, improving read performance for language stats pages.
- **Preferred translation language** — new `preferred_translation_lang` column on `user_deck` for per-deck translation language override.

### UI Changes (migration track)

- **Notification bell + page** — bell icon in app nav with unread badge, `/notifications` page with notification list, empty state, and mark-all-read. Realtime subscription for live delivery.
- **Display preferences** — font preference (default/dyslexic) and global review answer mode toggleable from the display preferences sheet.
- **Deck settings: answer mode** — per-deck 2-button/4-button toggle with clear-to-profile-default option.
- **Review UI** — 2-button mode shows only Again and Good; 4-button mode shows all four FSRS ratings.

### Fast-Track Changes (released independently)

#### Features

- Search results now include playlists and requests, not just phrases
- Show a login button on the public learn page for logged-out visitors
- Show card due dates (overdue/today/upcoming) in the deck management table
- Add "Add all cards to deck" button to playlist view
- Add "Remove image" button to avatar editor in profile settings
- Prevent translation language from matching phrase language across all forms
- Add manage deck page with sortable card table and status controls
- Add inline phrase creation on playlist page, simplify detail view

#### Improvements

- Feed filtering is now instant: client-side results appear immediately while server backfills
- Playlist displays more compactly in the feed
- Languages Known field on profile is more compact on mobile using container queries
- Card status controls disable while mutations are pending
- Replace purple bookmark badge with purple-bg quote icon in feed
- Improve review rating buttons spacing with two-line layout
- Improve warmup preview wording to be clearer about new cards
- Always show avatar fallback instead of blank space
- Search overlay: hide keyboard shortcuts on mobile
- Fade-in animation and height-hold for "save & add another" remount

#### Fixes

- Fix sticky app-nav: `overflow-x-hidden` was creating a scroll container, switched to `overflow-x-clip`
- Fix comment reply dialog layout for narrow screens
- Fix FSRS due dates, reviewed display, and related cleanup
- Fix feed filtering hybrid client + server approach for instant results
- Fix badge text wrapping on playlist item; fix profile page not filling width
- Fix phrase card race condition on direct URL navigation
- Fix request-header bunchup of badge and buttons
- Fix review session failing when user_card duplicates exist in DB
- Fix sidebar trigger poking through modal overlays
- Fix event propagation on card status heart button
- Fix flaky e2e nav tests: seed data, dropdown logic, CI timeouts

#### Chore

- Upgrade Zod from 3.25 to 4.3.6
- Deduplicate esbuild, upgrade `@vitejs/plugin-react` to v5
- Replace `@uidotdev/usehooks` and `react-intersection-observer` with internal implementations
- Stabilise `eslint-plugin-react-hooks` to `^6.0.0`, pin Radix overrides
- Remove `master` from branch detection fallback in fixup hook
- RequestForm extracted into a reusable component shared between new-request page and feed composer
- UpdatePlaylistDialog migrated to react-hook-form with reusable CoverImageField

### Testing

- 44 new vitest unit tests across notifications, profile, and deck schemas (195 total)
- 5 new scenetest spec files covering notifications, review answer mode, comments, playlists, and display preferences
- 10 additional scenetest scenes documented but blocked on `setup:` directive (tracked in `scenetest/SETUP_DIRECTIVE.md`)
- Comprehensive seed data additions: 8 Kannada phrases, 6 playlists, 10 comments with replies, 18 card reviews
- RLS security audit: all 22 uid-scoped tables verified, grade A

## v0.17 - Unified Search, Language Filter Pills, Social Media Embeds

_27th March, 2026_

### Major Changes

- Unify search: replace deck search page with a modal, lifted to `/learn` layout and accessible from main navigation
- Replace expand/collapse language sections with inline pills + "more" button for a cleaner filter UI

### Features

- Add YouTube Shorts, Instagram, and TikTok support to playlist embeds
- Accept `q` and `langs` search params on `/search` page for deep-linkable searches
- Progressive disclosure in search overlay: blank command palette until user types

### Improvements

- Make the empty-query search flyout more informative and visually engaging
- Await data fetches in parallel for faster load times

### Fixes

- Fix search filter breaking on special characters like `?`
- Fix search input parsing to strip punctuation from tokens
- Fix language filter pills not reflecting URL-derived language on load

## v0.16 - Feed Composer, Phrase Finder, Feature Module Refactor, Review Polish

_25th March, 2026_

### Major Changes

- Add chat-style Phrase Finder search page at `/search` with tag/language filters and smart search input
- Refactor codebase into deep module architecture — schemas, collections, and hooks moved into per-domain `src/features/` directories
- Simplify card navigation: remove animation state machine, make transitions interruptible for rapid clicking

### Features

- Add feed composer at top of feed — click to post a community request inline, or jump to phrase/playlist creation
- Enhance chat recommend dialog to support phrases, playlists, and requests (not just phrases)
- Persist charts language selection in URL search param
- Simplify feed filter controls: lightweight text buttons for sort mode, compact dropdown for content type filter
- Add desktop filter tabs to feed with mobile dropdown fallback
- Add suggest-fixup-commit pre-tool hook for better git hygiene

### Improvements

- Upgrade tailwind-oklch to v0.5.0 for improved color vibrancy
- Increase base font size from 16px to 18px across the app
- Move realtime subscriptions into `useSocialRealtime` hook
- Hide right sidebar when there are no context menu links
- Improve callout styling: lighter problem variant, hue inheritance
- Fix app-nav horizontal overflow: hide scrollbar and prevent first link clipping
- Use white text on Again, Good, and Easy review buttons
- Make entire result row clickable in chat recommend dialog
- Skip card creation when user has no deck for the language

### Fixes

- Fix send-in-chat modal flashing and disappearing from review screen
- Fix double scrollbar by introducing fixedHeight layout mode
- Fix manage phrases dialog scrolling (replace ScrollArea with plain div)
- Fix tag-word stripping bug in search input parser
- Cache Docker layers and exclude unnecessary Supabase services in CI

## v0.15 - Base UI Migration, Library Charts, Button System, OKLCH Color System

_26th Feb, 2026_

### Major Changes

- Migrate from Radix UI to Base UI primitives
- Integrate tailwind-oklch plugin and migrate entire color system
- Consolidate button variants to a deliberate 5-variant model (default, neutral, soft, ghost, red)
- Add library data visualizations page with 4 interactive charts (treemap, histogram, scatter, bar)

### Features

- Add browse search overlay with Ctrl+K shortcut
- Add /microcopy route to display all action labels and icons
- Upgrade bulk-add: staging list UX, spreadsheet import, and responsive layout
- Move library charts under /learn/browse/charts as a sub-route
- Add scenetest CI job to test workflow

### Improvements

- Clarify and harden logic for navigating review stages
- Refactor info boxes on deck settings page to per-section dialogs
- Add hover state to inactive app-nav links with increased chroma/contrast
- Lighten nav deck menu background
- Remove positive tabIndex values from forms for better accessibility
- Define Microcopy/ActionCopy types and adopt in statusStrings

### Fixes

- Fix navbar horizontal overflow causing page scroll
- Fix app layout scroll: outlet grows naturally, pages scroll on overflow
- Fix chart text invisible in dark mode
- Fix React Compiler errors and correctness issues
- Fix dependency vulnerabilities (supabase, eslint deps)

## v0.14 - Dynamic Themes, Vitest, Focus mode, Nicer Toasts, Simplify Review Flow

_13th Feb, 2026_

- OKLCH colours and /themes manager [#362](https://github.com/mhsnook/sunlo/pull/362)
- Add Vitest [#363](https://github.com/mhsnook/sunlo/pull/363)
- Add focus mode for reviews with no sidebar [#355](https://github.com/mhsnook/sunlo/pull/355)
- Center content area and balance right-hand sidebar [#356](https://github.com/mhsnook/sunlo/pull/356)
- Improve: work on flakey tests, aria labels, semantic IDs [#360](https://github.com/mhsnook/sunlo/pull/360)
- Polish: Improve sonner style (all in bottom right, info toasts persist) [#352](https://github.com/mhsnook/sunlo/pull/352)
- Fix: Address a couple security issues [#368](https://github.com/mhsnook/sunlo/pull/368)
- Improve: Stop _inferring_ review stage and just record it [#357](https://github.com/mhsnook/sunlo/pull/357)
- Fix Playlist URL validation [#361](https://github.com/mhsnook/sunlo/pull/361)
- Reduce clicks required to add a phrase to a playlist [#358](https://github.com/mhsnook/sunlo/pull/358)
- Add slide animation to review cards [#359](https://github.com/mhsnook/sunlo/pull/359)
- Fix Supabase post-install failure [#366](https://github.com/mhsnook/sunlo/pull/366)

## v0.13 - Tiny deploy

_28th Jan, 2026_

- Make the scenetest specs work

## v0.12 - Show intro notices, add scenetest-js, peruse new cards, highlight ongoing review

_26th Jan, 2026_

- Add intro/onboarding system with useIntro hook, fix tests (bfbbf83d)
- Highlight active/ongoing review in sidebar and nav (fb4d8675)
- Add "peruse new cards" interface before review (0841b035)
- Remove yellow/gold (sand) theme from rotation (888ee649)
- Fix layout and display issues: 404 page, card count, button breakpoints (84226546)
- Fix select dropdown not scrolling when content overflows viewport (f3438ab8)
- Improve accessibility: aria-labels, role=link, keyboard support (a410afe0)
- Show unread message in chat preview instead of most recent (46188118)
- DX: Add scenetest-js, actors, scenes, lots of test labels (700d2c32)

## v0.11

_21st Jan, 2026_

- Feature: Social media previews (using edge middleware)
- Feature: Chat messages have read/unread
- Feature: Welcome page now welcomes new users
- Fix: Second sidebar was hiding sometimes, and too complex
- Fix: The scrollable areas weren't constraining/flexing just right
- DX: Improve tests, log redirects
- Feature: Full width interfaces! Right sidebar "Quick actions"
- Polish: Group & style the Response Buttons row
- Chore: Convert all toasts to Sonner
- Feature: Copyable, persistent toasts, particularly for errors

## v0.10 - Smart Search, DM Playlists, Popularity Feed

_18th Jan, 2026_

- Smart search! using trigrams (f094673b6a8205f655630f0c7b3fb875eea140ef)
- (c2, d2) Feature: Friends feed and Popular feed polymorphic with filters
- Add "popularity" to the feed-activities view
- (c1, d1) Move add-phrases route to `learn/$lang/phrases/new`
- (c2, d2) Feature: Playlists image option
- (c1, d1) Feature: "You completed your review" nicer screen
- (c2, d2) Chore: Replace the friend request / accept / cancel logic with a before hook
- Fix: ALL remaining `tsc -b` errors
- Feat: Cover images on Playlists!
- Fix/Refactor: Review cards flow/order is fixed, more declarative, more local-first, w better completion screen
- Prevent spoofing uids by updating RLS Insert policies
- Feat: share playlists in chat
- Fix: window height in chat window

## v0.9 - Only-Reverse-Reviews, Github Actions CI

_16h Jan, 2026_

- (c2, d2) DX: GitHub actions for CI/CD
- (c2, d2) DX: Navigating-around-the-app tests
- (c2, d2) Chore: Retire PLv8, move FSRS to client
- (c1, d1) Feat: catch login on signup page and show better feedback
- (c2, d1) Feat: edit or archive translations
- (c1, d1) Fix: query collection errors on logout/login
- (c2, d2) Feat: Only-Reverse-Reviews setting for some cards
- (c2, d2) Fix: Auth state transition bugs (sign out + login race conditions)

## v0.8 - Browse Page

_15th Jan, 2026_

- (c1, d1) A. Fix: Embeds not working in production (bdd0e7e9)
- (c1, d1) AB. Fix: Poor RLS performance for chat messages (16b3f200)
- (c1, d1) B. Feature: Add Dyslexie/OpenDyslexic font support (8ca64970)
- (c1, d2) Feature L: Browse page search box, w filters (bc04dc1a)

## v0.7 - New `phrase_meta` view, More local-first-ian

_14th Jan, 2026_

- (c3, d2) Refactor: meta_phrase_info into phrase_meta, do less, more reliably
- (c1, d1) Fix: review buttons were all one colour
- (c1, d1) Fix ago() returning '1 mo ago' for null dates (e723a944)
- (c1, d1) Fix /learn/undefined should 404 (45b04d8e - prior work)
- (c1, d1) Fix DialogContent aria-labelledby/description warnings (a73a4fbf)
- (c1, d1) Make default theme 'light' (85474e8f)
- (c1, d1) Add 'add to deck' option to bulk-add (746f3073)
- (c1, d1) Add 'learned' and 'skip' options to review context menu (4da341d1)

## v0.6 - React Compiler, Bookmark Phrases

_12th Jan, 2026_

- (c1, d1) Fix: Loading spinner creating scrollbars
- (c3, d2) Add: react compiler, remove linter cruft
- (c1, d1) Chore: Remove these console logs `We expected a userId here`
- (c1, d1) Fix: convert the PlusMenu to standard shadcn menu
- (c1, d1) Design: Try font "Instrument Sans"
- (c1, d1) Design: Use Bookmark\* icons to card status
- (c1, d1) Feat: throw notFound() for /learn/{whatever}
- (c1, d1) Changing card status updates the phrase's metadata (count_learners) etc

### v0.5.2 - Hotfix: Drop conflicting RPC for adding phrases

### v0.5.1 - Hotfix: Remove Ugly Theme\*\*

## v0.5 - Public Mode

_10th Jan, 2026_

- (c3, d3) Public mode
- (c3, d3) When you try to add a phrase but you don't have a deck for that language, a checkbox gives you the option to start learning (or re-activate) that deck, or to create the new phrase without one.
- (c2, d2) Deck-configurable preferred translation lang
- (c1, d1) Fix Typescript Errors in Bulk-Add.tsx

## v0.4 - Playlists and the Polymorphic Feed

_January 2026_

This release adds an important "Playlists" feature, which allows users to add a set of cards together, and group them with a title and description, and optionally a link to an external resource like a podcast or a video or a song. So users can create things like:

- A set of phrases that are words to an iconic song
- A set of phrases that have been taught in this episode of a lesson or podcast
- A set of lines from a movie compilation

The first user will make and publish the playlist, and then other users can choose to watch or listen to the media and then add the set of phrases to their deck, and they won't appear at random any more because they will have been introduced in some way, giving the users choice and aligned expectations for what they experience in their review sessions.

Then, the existence of the Playlists, which also need to be displayed on the feed alongside Requests, led us to the creation of a _Feed view_ which combines Requests, Playlists, and also newly created Phrases. This Feed operates differently from our local collections because it doesn't contain the library data, it just shows us an order, essentially returning a Feed Skeleton with some attached metadata for any client-side sorting that may be required. These quasi Feed Skeletons are stored simply in a react query cache.

## v0.3 - Feeds! Recent requests, upvotes, comments, recs

_December 2025_

Here we have added the bulk of the features that the architectural work of v0.2 was meant to make
possible for our small team to maintain a fully modern approach that meets very high standards for
a native-feeling mobile app, while adding on a big surface area of interactive features: a social
media style feed with comments, votes, different feeds/algos, etc.

You can [view new features and views in the screenshots posted on the PR](https://github.com/mhsnook/sunlo/pull/252#issuecomment-3679066683). They include:

- The language requests feed is now much more like a social media feed, with request posts, top-
  level comments, and replies.
- Comments and replies can have up to 4 card recommendations, which are treated as proposed
  "answers" to the request.
- We currently have feeds for "most recent" and "friends", and have a disabled teaser option for
  "most popular" to indicate the direction we plan to go with this in the near future.

[Style work and visual language enhancements are also shown and detailed in the PR.](https://github.com/mhsnook/sunlo/pull/252#issuecomment-3679066683)

## v0.2 - Social Features and New Data Management

_November 2025_

Since April we have added direct messages, realtime connections for friend requests, alert badges
to help users discover features and important interactions.

We have opened up a new feature realm with the addition of "Phrase Requests", allowing users to
describe a situation and what they want to communicate, and ask native speakers to answer with a
flash card that will prepare them for similar situations in the future. This "requests" concept
provides a cross-language meta-layer, describing what linguists call "messages" (the actual _thing_
you want to convey), which mirrors the way people actually learn languages in the real world: by
asking a friend or colleague who speaks the language already, "Hey, when I want to hail a cab, what
do I say?"

In the next phase, this "Requests" concept will become the basis for additional social features,
and will allow us to identify _across all languages_ which types of cards will be most useful for
learners of other languages, to help us make the most out of our crowd-sourcing model, so that work
put into one language can be used to ease the path for others.

To make these more interactive and more social features perform better on device, and require less
bandwidth and re-fetching from the server, this version include a major upgrade to the way
data is fetched and stored on device, using Tanstack DB's live queries for all data in the app.

- Preloads almost the entire database in route loaders (we will replace this soon with more precise
  partial loaders, added in a recent version but not needed yet).
- Local DB _Collections_ store normalised copies of data, backed by Zod schemas.
- `useSomeData` style hooks are now based on `useLiveQuery` which allows us to join and filter data,
  and, importantly, to calculate aggregate data this way so we can replace postgres-view-based
  aggregation and have our aggregates automatically respond to any inserts into the local database.
- Collections are initialised, populated, and invalidated/cleared differently to how the query
  cache worked, so we have to be more careful about race conditions on loading and logout.

To help us manage this new complexity, we have added Playwright for end-to-end testing, which pairs
well with the Schema-backed runtime validation of our Collections to test all interactions between
client and server.

- Use Playwright specs to orcestrate browser navigation through all main features of the app,
  particularly mutations.
- Use `both-helpers.ts` to query the DB as service role and evaluate the local collection and
  return both, then compare them in the spec.

## v0.1 - The MEP

_April 2025_

This release contains the minimum feature set for an enjoyable flash card-learning experience.

Users can create cards, add translations, and perform reviews with the Spaced Repetition system,
FSRS v5.0. Read more:

- [Wikipedia: Spaced Repetition](https://en.wikipedia.org/wiki/Spaced_repetition)
- [The FSRS Algorithm, Explain](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) (with more links!)
