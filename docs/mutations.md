# Mutations, Forms & Realtime

## Mutations Pattern

**Standard:** define persistence on the collection itself via `onInsert / onUpdate` handlers (always soft delete or archive with row updates, because the realtime slicing and RLS are funny about deletes), then call `collection.insert / update` from components. The optimistic update lands in the same tick; throwing from the handler rolls it back automatically. Attach success/error UX to the returned `Transaction.isPersisted.promise`.

```typescript
// features/<domain>/collections.ts — persistence lives here
export const cardsCollection = createCollection(
	queryCollectionOptions({
		// ...id, queryKey, queryFn, getKey, schema...
		onInsert: async ({ transaction }) => {
			const rows = transaction.mutations.map((m) => m.modified)
			const { data } = await supabase
				.from('user_card')
				.insert(rows) // one request, however many rows the transaction sent
				.select() // ask for the rows back so we can skip the refetch
				.throwOnError()
			writeSyncedRows(
				cardsCollection,
				data?.map((row) => CardSchema.parse(row)) ?? []
			)
			return { refetch: false } // the rows are written back; skip the reload
		},
	})
)

// component — declare the optimistic intent, react to collection state
const addCard = (phrase: PhraseType, status: CardStatus) => {
	const nowIso = new Date().toISOString()
	const tx = cardsCollection.insert(
		directionsForPhrase(phrase.only_reverse).map((direction) => ({
			id: crypto.randomUUID(),
			uid: userId,
			phrase_id: phrase.id,
			lang: phrase.lang,
			status,
			direction,
			created_at: nowIso,
			updated_at: nowIso,
		}))
	)
	tx.isPersisted.promise.then(
		() => toastSuccess(STATUS_TOAST_MESSAGES[status]),
		(err) => {
			toastError('Failed to add this card to your deck')
			console.error('rolled back', err)
		}
	)
}
```

The component subscribes to the collection via `useLiveQuery`, so the card appears in the deck in the same tick and disappears again if the server rejects the write.

A handler that updates rather than inserts can only batch when every row takes the same column values — `groupUpdatesByChanges` finds those groups. Otherwise it sends one request per mutation inside a `Promise.all`.

See `src/components/card-pieces/card-status-dropdown.tsx` for the call site this example is drawn from. See also the [TanStack DB optimistic-mutations skill](../node_modules/@tanstack/db/skills/db-core/mutations-optimistic/SKILL.md) for `createOptimisticAction` (multi-collection atomic mutations) and `createPacedMutations` (auto-save / debounce / throttle).

### When the optimistic state is worse than waiting

`collection.insert / update` take `{ optimistic: false }`. The handler still runs and the transaction still resolves through `isPersisted.promise`; the row just never enters the optimistic layer, so it appears when the handler writes the server's row back.

Reach for it when a rollback would be more confusing than a wait. Friend requests are the case in the app today: `validate_friend_request_action` rejects several transitions, and a relationship that reads "friends" for a moment and then reads "unconnected" again is a worse thing to show than a button that waits and then reports the error. `useFriendRequestAction` writes non-optimistically and holds its own `pendingAction` for the spinner.

This is the exception, not the default. Most writes are safe to show immediately: the server accepts them, and the optimistic value is what the user came to see.

**Reasonable exceptions:**

- **Realtime sync handlers** writing supabase channel events into a collection (`writeSyncedRow(chatMessagesCollection, row)` inside a `postgres_changes` callback) — that's sync, not a mutation.
- **Mutations that write several collections in one server round-trip** (e.g. `create_comment_with_phrases`, which writes the comment, its phrases and the links together) — `createOptimisticAction` keeps the optimistic writes across those collections atomic.

## Write the rows back, then skip the refetch

Returning all affected rows from the supabase API and writing them back to the collection with `writeSyncedRows` allows us to skip refetching the whole table after mutations (`{ refetch: false }`).

A collection holds two layers. The optimistic layer carries your change from the moment you make it. The synced layer holds what the server last told us. When the transaction ends, the optimistic overlay drops and the user sees only the synced layer, so we have to write back the server's affected rows when we skip the refetch or else the UI will drop all traces of the newly mutated row.

Trust the server's row over your local copy. "The optimistic value already matches the server" is an assumption, not a fact — check it with `should()` rather than build on it.

Treat `collection.utils.refetch()` like `useEffect`: it re-runs the collection's `queryFn`, pulling the whole table to confirm one row, so stop and check with the human before adding one.

### What to write back, per operation

```typescript
// update — .select() the row, then write it back
const { data } = await supabase
	.from('phrase_translation')
	.update(changes)
	.eq('id', m.original.id)
	.select()
	.throwOnError()
const row = data?.[0]
if (row)
	writeSyncedRow(phraseTranslationsCollection, TranslationSchema.parse(row))

// insert — one .select() returns every row the transaction sent
const { data } = await supabase
	.from('phrase_translation')
	.insert(submitted)
	.select()
	.throwOnError()
writeSyncedRows(
	phraseTranslationsCollection,
	data?.map((row) => TranslationSchema.parse(row)) ?? []
)

// delete — soft-delete instead: `.update({ deleted: true })` and write the
// row back like any other update
```

`writeSyncedRows` handles collection upserts safely, using whole-row replacements — a detail that matters when a collection is based on a view that adds columns to the base table, such as `phrasesCollection`, which writes `phrase` but reads `phrase_meta`. Spread the row you hold under the one the server returned.

```typescript
const current = phrasesCollection.get(m.original.id) ?? m.original
writeSyncedRow(phrasesCollection, PhraseSchema.parse({ ...current, ...row }))
```

An insert into the same collection needs no spread, because the schema's defaults are already right for a row nobody has touched yet — a phrase you just created has no learners.

### Check the assumption with `should()`

The old rule leaned on "our optimistic value matches the server." Several handlers already `.select()` the row and feed it to `should()` — that is the right instinct, and the returned row should then be written down as well. One `.select()` serves both: the check catches a wrong mental model in dev, and the write keeps the collection correct in production.

```typescript
const { data } = await supabase
	.from('user_card')
	.update(changes)
	.eq('id', id)
	.select()
	.throwOnError()
const row = data?.[0]
should(
	`user_card ${id} server row matches the submitted update`,
	rowMatches(changes, row),
	{ submitted: changes, returned: row }
)
if (row) writeSyncedRow(cardsCollection, CardSchema.parse(row))
```

`rowMatches(submitted, row)` is that comparison: every field the handler submitted comes back unchanged on the server's row. A missing row passes (a soft delete may not be selectable back under RLS), and `created_at` / `updated_at` are the server's to set. `allRowsMatch(submitted, returned)` is the insert-handler form — one matching row back per row sent.

`should()` reports to the observer panel in dev and test, and the Vite plugin strips it from production builds, arguments included. See `docs/testing.md`.

### One way into the synced layer

Every write to the synced layer goes through `src/lib/collections/synced-row.ts`, whether the row came back on a mutation's ack or arrived as a realtime frame:

```typescript
writeSyncedRow(collection, row) // writeSyncedRows(collection, rows) for many
```

There is no helper for dropping a row, because nothing drops one — a removal sets a flag, and reaches the collection as an ordinary update. No collection configures an `onDelete` handler, so a stray `collection.delete()` throws `MissingDeleteHandlerError`. Which flag each table uses, and what a removed row still shows, is `docs/database.md`.

Pass the whole row — the key comes from the collection's own `getKeyFromItem`. Prefer the plural form for a handler's ack, which usually has more than one row. The rest (upsert semantics, skipping a row already held, batching, and what happens on a collection that never loaded) is the function's business, not the caller's.

One thing the caller does owe it: **preload a collection in the route loader wherever its rows are displayed or written.** A write to a collection nothing has loaded is dropped, and the row waits for the next fetch.

**Where the rule applies:** every persistence handler and every realtime binding. Two kinds of call site still use `collection.utils.*` directly, and both are deliberate:

- **A partial update that must merge**, like `card-status.ts` patching `count_learners` onto a `phrasesCollection` row. `writeSyncedRow` upserts, and upsert **replaces** — it needs the whole row.
- **The deprecated `useMutation` + `writeInsert`-in-`onSuccess` sites.** See #758; they pick the rule up as they move onto collection handlers.

A new site outside those two is a sign the row should go through the collection.

### Realtime is a backstop, not the mechanism

A realtime frame arrives after the database commits, so it carries the truth and is safe to write into the synced layer. But a collection that is only correct once the frame lands is wrong until then, and stays wrong whenever the socket is down. Make the handler correct on its own; let realtime cover the writes made by other clients and other devices.

Bind frames with `bindRows(channel, table, collection, parse)` in `useUserRealtime`, which folds INSERT and UPDATE through `writeSyncedRow` (above).

**INSERT and UPDATE frames are RLS-scoped; DELETE frames are not.** Supabase tests each subscriber's policies against the new row, so an insert or update reaches you only if you could have fetched that row yourself. It cannot do the same for a delete, because the row is already gone by then. So every delete on a published table reaches every subscriber of that table, whoever owned the row.

A delete frame also carries only the table's replica identity — the primary key, unless the table is set to `replica identity full`. Every other column is absent.

So nothing subscribes to DELETE and nothing hard-deletes. Four places carry that, to grep:

|           |                                                                                |
| --------- | ------------------------------------------------------------------------------ |
| the flag  | `deleted` or `archived` on the row — `docs/database.md` says which, per table  |
| the write | `collection.update(key, (draft) => { draft.deleted = true })` at the call site |
| the read  | the `*Active` collections in each feature's `live.ts`                          |
| the guard | no `onDelete` handler anywhere, so `collection.delete()` throws                |

**State the filter once, in a derived collection.** `phraseRequestsActive`, `commentsActive`, `phraseTagLinksActive` and the rest live in each feature's `live.ts` and pre-filter `deleted = false`; read sites use those and say nothing about the flag. Filter inline only where the flag is what the component is showing — the upvote button reads `upvote.deleted` to pick filled or outline, so it wants the raw collection.

**A collection's `queryFn` never filters `deleted` itself.** Two layers already decide what a client holds and what it shows, and a third opinion in the fetch only makes the collection disagree with its table: RLS decides which rows this user may read at all, and the live queries decide which of those to render. A handler's `.select()` write-back puts the just-flagged row into the synced layer regardless, so a `queryFn` that filtered would give a collection whose contents depend on whether you flagged the row this session or reloaded since.

**If we ever publish a soft-deleted table**, one flag is not enough: the UPDATE that sets `deleted` is exactly the frame RLS will withhold, if the SELECT policy narrows on it (see `docs/database.md`). It would take two steps — a `deleting` state the policy still admits, which subscribers receive and act on by dropping the row themselves, then the final `deleted` state they never see and no longer need. A client holding a row for the moment between the two is not a leak: it was allowed to read that row already.

## Mutation Best Practices

- **Persistence lives on the collection** via `onInsert/onUpdate` handlers; call sites use `collection.insert / update` for optimistic local state
- **Throw from the handler** to roll the optimistic state back
- **Write the server's rows back before returning `{ refetch: false }`** — a handler that skips the refetch without writing the rows leaves the user looking at the pre-mutation row. See [Write the rows back, then skip the refetch](#write-the-rows-back-then-skip-the-refetch)
- **Wire success/error toasts to `Transaction.isPersisted.promise`** at the call site — `onSuccess` errors won't masquerade as mutation errors anymore
- **Subscribe to collection state with `useLiveQuery`** so the UI reflects the optimistic value (and snaps back on rollback) without ad-hoc local state
- For a mutation that writes several collections in one round-trip, see `createOptimisticAction` in the TanStack DB optimistic-mutations skill

## The deprecated pattern: `useMutation` + `onSuccess` + `collection.utils.write*`

Migration defined in #625; the remaining call sites carry the `transform` label and move as they are touched. Grep for them with `\.utils\.write(Insert|Update|Delete)`.

It looked like this: a `useMutation` calling supabase itself, then syncing the collection by hand in `onSuccess`. Two things are wrong with it.

- **The optimistic update isn't one.** Local state only changes after the server answers, so the user waits for a round-trip to see their own click.
- **A successful write can report failure.** React Query routes an error thrown in `onSuccess` to `onError`, so if the hand-written sync throws, the row is saved and the user is told "Failed to create".

Both go away when persistence moves onto the collection. The call site becomes one line, and the toast hangs off the transaction:

```typescript
const tx = phrasesCollection.insert({ id: crypto.randomUUID(), ...values })
tx.isPersisted.promise.then(
	() => toastSuccess('Created!'),
	(err) => {
		toastError('Failed to create')
		console.error('rolled back', err)
	}
)
```

The row appears in the same tick and disappears again if the server rejects it. Most of the time you can drop the success toast too — the user can see the thing they made.

## Standard Form Pattern

Forms use **TanStack Form** through the app's composed hook — `useAppForm` from `src/components/form/form-hook.ts` (built with `createFormHook`). Do not import `useForm` from other form libraries; react-hook-form was removed.

1. Define a Zod schema for validation and pass it to the form's `validators`
2. Create the form with `useAppForm({ defaultValues, validators, onSubmit })`
3. Build fields from the pre-wired components registered in `form-hook.ts` — `form.AppField` with `EmailInput` / `PasswordInput` / `TextInput` / `TextareaInput`, plus `FormAlert` and `SubmitButton` form components
4. In `onSubmit`, call the collection mutation (`collection.insert/update`) and wire toasts to `tx.isPersisted.promise`
5. Copy an existing form (e.g. `src/components/requests/request-form.tsx`, `src/components/login-card-body.tsx`) rather than wiring from scratch

## Realtime Patterns

Every user-owned table folds through one channel, `useUserRealtime` in `src/hooks/use-user-realtime.ts`. It is subscribed in the `_user` layout and torn down on sign-out, and each table is one `bindRows` call:

```typescript
channel = bindRows(channel, 'user_card', mine, cardsCollection, (row) =>
	CardSchema.parse(row)
)
```

`bindRows` binds INSERT and UPDATE (never DELETE), filters server-side on `uid=eq.<userId>`, skips frames for a collection the route never loaded, and writes through `writeSyncedRow`. Adding a table means adding a `bindRows` line and putting the table in the `supabase_realtime` publication — check `docs/database.md` first if the table soft-deletes.

Two features subscribe outside this hook, because they react to an event rather than sync a collection: `src/features/notifications/hooks.ts` and `src/features/social/hooks.ts`.

## Query Configuration

Default query settings (from `src/lib/query-client.ts`): `staleTime` 2 minutes, `gcTime` 20 minutes, `refetchOnWindowFocus: false`, `refetchOnMount: false`. Collections handle most caching, so these are relatively conservative.

## Feed System

The feed is the one feature that uses `useInfiniteQuery` instead of collections, due to cursor-based pagination:

- **Query hooks**: `useFeedLang(lang)`, `useFilteredFeedLang(lang, filterType)`, `useFriendsFeedLang(lang)`, `usePopularFeedLang(lang)` — each has a filtered variant
- **Cursor**: `created_at` timestamp, 20 items per page, popular feed also sorts by `popularity` descending
- **Cache invalidation**: `useInvalidateFeed()` manually resets all feed query caches after mutations
- **Feed types**: 'request', 'playlist', 'phrase'
- **Client-side folding**: Removes child phrases from feed to avoid duplication (see `$lang.feed.tsx`)
