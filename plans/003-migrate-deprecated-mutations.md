# Plan 003: Migrate deprecated useMutation+onSuccess sync sites to collection handlers (notifications, playlists, deck)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1c4b60ef..HEAD -- src/features/notifications/ src/features/playlists/ src/features/deck/ src/components/playlists/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: none (do NOT touch social — that is plan 002's territory)
- **Category**: tech-debt

- **Planned at**: commit `1c4b60ef`, 2026-07-08

## Why this matters

CLAUDE.md marks the pattern "useMutation calling supabase directly + manual local sync in onSuccess" as **deprecated** (tracked under the `transform` label): React Query routes onSuccess-thrown errors to onError, so a successful DB write whose post-success collection sync throws surfaces as a misleading "Failed to X" toast; sync is non-atomic; and there is no optimistic update. The standard is: persistence lives on the collection via `onInsert/onUpdate/onDelete`, call sites use `collection.insert/update/delete`, UX attaches to `Transaction.isPersisted.promise`. This plan converts the three remaining non-social clusters. It also fixes a latent crash: `useMarkAsRead` does `return data[0]` with no guard, so a 0-row update (row deleted elsewhere / RLS) feeds `undefined` into `NotificationSchema.parse` in onSuccess.

## Current state

### The target pattern (exemplar — match this exactly)

`src/features/deck/collections.ts:92-161` — `cardsCollection.onInsert/onUpdate`: maps `transaction.mutations`, calls supabase with `.select().throwOnError()`, uses `should()` runtime checks (from `@scenetest/checks`, stripped from prod builds) to confirm server rows match the optimistic ones, returns `{ refetch: false }`. Call-site pattern (CLAUDE.md "Mutations Pattern"): `const tx = collection.update(id, draft => {...}); tx.isPersisted.promise.then(onOk, onErr)`.

For RLS-protected UPDATE/DELETE, also match the zero-row guard from `src/features/requests/collections.ts:260-299` (`messageTagsCollection.onUpdate/onDelete`): `.select()` then `if (!data || data.length === 0) throw new Error(...)` — RLS-blocked UPDATE/DELETE silently affect 0 rows with no PostgREST error. (INSERT does error under RLS denial, so onInsert does not need the guard.)

### Cluster A — notifications (`src/features/notifications/`)

- `collections.ts:7-27` — `notificationsCollection` has NO persistence handlers.
- `hooks.ts:28-43` — `useMarkAsRead`: useMutation → `.update({read_at}).eq('id', id).select()` → **`return data[0]` unguarded** → `onSuccess: writeUpdate(NotificationSchema.parse(data))`.
- `hooks.ts:45-70` — `useMarkAllAsRead`: useMutation → bulk update `.eq('uid', userId!).is('read_at', null)` → onSuccess loops the collection calling `writeUpdate` per unread row.

### Cluster B — playlists (`src/components/playlists/`)

- `src/features/playlists/collections.ts` — `phrasePlaylistsCollection` (line 15), `playlistPhraseLinksCollection` (line 36), `phrasePlaylistUpvotesCollection` (line 57): NO persistence handlers on any of them.
- `manage-playlist-phrases-dialog.tsx` — four deprecated mutations: `addPhraseMutation` (:89, onSuccess `writeInsert` :117), `removePhraseMutation` (:130, onSuccess `writeDelete` :141), `reorderMutation` (:150, onSuccess two `writeUpdate`s :194-195 — swaps `sort_order` of two link rows), `updateHrefMutation` (:203, onSuccess `writeUpdate` :216).
- `playlist-list-item.tsx` — `bulkAddMutation` (:53, inserts `user_card` rows for playlist phrases; onSuccess `cardsCollection.utils.writeInsert` per card :72-75) and `linkPhraseMutation` (:87, onSuccess `writeInsert` :107).
- `update-playlist-dialog.tsx` — `mutation` (:44, onSuccess `phrasePlaylistsCollection.utils.writeUpdate` :61-64).
- `delete-playlist-dialog.tsx` — `mutation` (:30, onSuccess `phrasePlaylistsCollection.utils.writeDelete(playlist.id)` :39-40).

### Cluster C — deck (`src/features/deck/mutations.ts`)

- `useNewDeckMutation` (:25-58): useMutation → `postNewDeck` raw insert (:14-23, includes `data[0] as Tables<'user_deck'>` cast) → onSuccess enriches with `languages[deck.lang]`, `decksCollection.utils.writeInsert(DeckMetaSchema.parse(deck2))`, a `should()` check, then navigates + toasts.
- `decksCollection` already has `onUpdate` (`src/features/deck/collections.ts:43`) but no `onInsert`. Note `decksCollection` uses `getKey: item.lang` (not id) and its schema `DeckMetaSchema` includes a derived `language` field not present on the `user_deck` table — the onInsert handler must strip derived fields before insert (mirror how `cardsCollection.onInsert` explicitly lists only the `user_card` columns, collections.ts:97-106).
- Inspect the rest of `mutations.ts` for further useMutation sites and treat them the same way.

### Legitimate exceptions — do NOT convert (CLAUDE.md sanctioned)

- Anything in `src/features/review/` (FSRS server-side transformation exception, documented).
- Anything in `src/features/social/` (plan 002).
- Auth flows (`login-card-body.tsx`, `password-reset-form.tsx`, signup/forgot-password/accept-invite/change-email routes) — no collection involved; useMutation is fine.
- RPC-based creations that return composite objects (e.g. `$lang.playlists.new.tsx` if it uses `create_playlist_with_links`) — those follow the createOptimisticAction/RPC pattern; only convert if they're doing the deprecated manual-sync-of-a-plain-table-write.
- `src/lib/upload-image.ts`, admin routes — out of scope.

## Commands you will need

| Purpose                              | Command                                                                                                                                                  | Expected on success |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck                            | `pnpm check`                                                                                                                                             | exit 0              |
| Lint                                 | `pnpm lint`                                                                                                                                              | exit 0              |
| Unit tests                           | `pnpm test:unit`                                                                                                                                         | all pass            |
| Scenes (needs `pnpm dev` + supabase) | `pnpm scene scenetest/scenes/notifications.spec.md` / `playlists.spec.md` / `playlists-hin-kan.spec.md` / `playlist-mutations.spec.ts` / `decks.spec.md` | all pass            |
| Full scene suite                     | `pnpm scene`                                                                                                                                             | all pass            |

## Suggested executor toolkit

- Load `node_modules/@tanstack/db/skills/db-core/mutations-optimistic/SKILL.md` before starting — it documents `onInsert/onUpdate/onDelete`, `Transaction.isPersisted.promise`, and `createOptimisticAction`.
- CLAUDE.md sections "Mutations Pattern" and "Mutation Best Practices".

## Scope

**In scope**:

- `src/features/notifications/collections.ts`, `src/features/notifications/hooks.ts`
- `src/features/playlists/collections.ts`
- `src/components/playlists/manage-playlist-phrases-dialog.tsx`, `playlist-list-item.tsx`, `update-playlist-dialog.tsx`, `delete-playlist-dialog.tsx`
- `src/features/deck/collections.ts`, `src/features/deck/mutations.ts`
- Barrel files (`index.ts`) of those features if exports change

**Out of scope** (do NOT touch):

- `src/features/social/**` (plan 002), `src/features/review/**` (documented exception), auth flows, admin routes, `src/features/requests/**` (already migrated), upvote buttons (plan 005 refactors them).

## Git workflow

- Branch: `advisor/003-migrate-deprecated-mutations`, based on `main`. No migrations → fast track.
- Commit per cluster (3 commits), imperative subject, e.g. `Migrate notification mutations to collection handlers` (see repo log, e.g. commit `cc6157ee "Drop phrase-creation RPCs; drive everything from collection actions"` for tone).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Notifications — add `onUpdate`, convert both hooks

1. In `notifications/collections.ts`, add an `onUpdate` handler to `notificationsCollection` following `messageTagsCollection.onUpdate` (requests/collections.ts:260-281): update by `m.original.id`, `.select().throwOnError()`, throw on zero rows, `return { refetch: false }`.
2. Rewrite `useMarkAsRead` as a plain function (not a hook — no closure state needed): `notificationsCollection.update(id, draft => { draft.read_at = new Date().toISOString() })`. Attach error toast via `tx.isPersisted.promise.catch(...)` at the call site if one existed before (check callers with `grep -rn "useMarkAsRead" src/`).
3. Rewrite `useMarkAllAsRead`: use `notificationsCollection.update(arrayOfUnreadIds, draft => ...)` (TanStack DB accepts an array of keys — verify in the skill doc; if multi-key update isn't supported in the installed version, loop inside a single `createOptimisticAction` instead). The handler's bulk server call can stay a single `.eq('uid', userId).is('read_at', null)` update — but the handler receives per-row mutations; simplest correct approach: per-row updates in `Promise.all` like the exemplar. Keep it simple and correct over clever.
4. Update callers (grep for both hook names) and the feature barrel.

**Verify**: `pnpm check` → 0; `pnpm scene scenetest/scenes/notifications.spec.md` → pass.

### Step 2: Playlists — add handlers, convert six call sites

1. In `playlists/collections.ts` add:
   - `phrasePlaylistsCollection.onUpdate` and `.onDelete` (zero-row guard pattern).
   - `playlistPhraseLinksCollection.onInsert`, `.onUpdate`, `.onDelete`. For onInsert, strip any schema-derived fields (read `PlaylistPhraseLinkSchema` in `playlists/schemas.ts` and compare to the `playlist_phrase_link` table columns in `src/types/supabase.ts` first; mirror `cardsCollection.onInsert`'s explicit column list).
2. Convert the call sites:
   - `update-playlist-dialog.tsx` → `phrasePlaylistsCollection.update(playlist.id, draft => {...})`, toasts on `isPersisted.promise`.
   - `delete-playlist-dialog.tsx` → `phrasePlaylistsCollection.delete(playlist.id)`, toasts/navigation on `isPersisted.promise`.
   - `manage-playlist-phrases-dialog.tsx`: add → `playlistPhraseLinksCollection.insert({...})` with a client-generated id (`crypto.randomUUID()` — CLAUDE.md: "pass client-generated IDs to the server so optimistic === synced"); remove → `.delete(linkId)`; updateHref → `.update(linkId, draft => ...)`; reorder → single `playlistPhraseLinksCollection.update([currentId, targetId], drafts => ...)` swapping `sort_order` so both rows ride one transaction (one rollback unit). If the installed version rejects multi-key update, STOP condition.
   - `playlist-list-item.tsx`: `linkPhraseMutation` → `playlistPhraseLinksCollection.insert`. `bulkAddMutation` inserts `user_card` rows → `cardsCollection.insert([...rows])` — `cardsCollection.onInsert` ALREADY exists (deck/collections.ts:92) and handles arrays; build the card rows client-side with generated ids and let the existing handler persist them.
3. Check the `sort_order` semantics for inserts (what does the current mutationFn compute? preserve it exactly).

**Verify**: `pnpm check` → 0; `pnpm scene scenetest/scenes/playlists.spec.md scenetest/scenes/playlists-hin-kan.spec.md scenetest/scenes/playlist-mutations.spec.ts` → pass.

### Step 3: Deck — add `decksCollection.onInsert`, convert `useNewDeckMutation`

1. Add `onInsert` to `decksCollection` (deck/collections.ts): insert only real `user_deck` columns (NOT the derived `language` field — check `DeckMetaSchema` vs the `user_deck` table type), `.select().throwOnError()`, keep the existing `should()` style check (see cardsCollection.onInsert:114-129), `return { refetch: false }`.
2. Rewrite `useNewDeckMutation` (deck/mutations.ts:25-58): call site builds the full optimistic `DeckMetaType` (including `language: languages[lang]`), calls `decksCollection.insert(deck)`, and moves the navigate + toast into `tx.isPersisted.promise.then(...)`, error toast in `.catch(...)`. Delete `postNewDeck`. Preserve the existing `should()` check semantics inside the handler.
3. Sweep the rest of `deck/mutations.ts` for other deprecated sites and convert with the same pattern.

**Verify**: `pnpm check` → 0; `pnpm scene scenetest/scenes/decks.spec.md` → pass (deck creation flow).

### Step 4: Full verification

**Verify**:

- `pnpm check`, `pnpm lint`, `pnpm test:unit` → all exit 0
- `pnpm scene` → full suite passes
- `grep -rn "useMutation" src/features/notifications src/features/playlists src/features/deck src/components/playlists` → no matches (deck/mutations.ts may retain non-collection mutations only if they match a documented exception — justify any remainder in your report)

## Test plan

- Primary: the existing scene specs listed in Commands (notifications, playlists ×3, decks) are the regression net — they assert toasts and list state through the UI.
- Add inline runtime checks (`should()` from the scenetest checks package) inside each new collection handler confirming server rows match optimistic rows — mirror `cardsCollection.onInsert:114-129`. These are the repo's preferred mutation-flow assertion (CLAUDE.md "Runtime checks").
- No new vitest files required; handlers are exercised through scenes.

## Done criteria

- [ ] `grep -rn "useMutation" src/features/notifications src/features/playlists src/components/playlists` returns no matches
- [ ] `notificationsCollection`, `phrasePlaylistsCollection`, `playlistPhraseLinksCollection` each define the handlers their call sites need; `decksCollection` has `onInsert`
- [ ] Every new onUpdate/onDelete has the zero-row RLS guard; every handler returns `{ refetch: false }`
- [ ] `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm scene` all pass
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Multi-key `collection.update([id1, id2], ...)` is unsupported by the installed `@tanstack/db` version and the reorder swap can't ride one transaction.
- A mutationFn turns out to do server-side work the client can't predict (computed columns, triggers mutating rows) — that site needs `createOptimisticAction` with server-row writeback instead; report which site before proceeding.
- `DeckMetaSchema` or `PlaylistPhraseLinkSchema` fields don't cleanly partition into "table columns" vs "derived" (you'd be guessing at the insert payload).
- A scene spec fails in a way unrelated to your change (pre-existing flake/regression — report, don't paper over).
- You find yourself wanting `collection.utils.refetch()` anywhere — CLAUDE.md requires checking with the human first.

## Maintenance notes

- After this plan plus plan 002, the remaining `useMutation` sites should all be documented exceptions (auth, review/FSRS, RPC-composites, image upload, admin). A reviewer can enforce "no new deprecated sites" by grepping in review.
- The reorder swap's single-transaction behavior is what a reviewer should scrutinize hardest: dragging must roll back BOTH rows if the server rejects either update.
- Deferred: `phrasePlaylistUpvotesCollection` handlers — plan 005 (upvote factory) covers the upvote paths; don't add handlers here.
