# Mutations, Forms & Realtime

## Mutations Pattern

**Standard:** define persistence on the collection itself via `onInsert / onUpdate / onDelete` handlers, then call `collection.insert / update / delete` from components. The optimistic update lands in the same tick; throwing from the handler rolls it back automatically. Attach success/error UX to the returned `Transaction.isPersisted.promise`.

```typescript
// features/<domain>/collections.ts — persistence lives here
export const cardsCollection = createCollection(
	queryCollectionOptions({
		// ...id, queryKey, queryFn, getKey, schema...
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('user_card')
						.update(m.changes)
						.eq('id', m.original.id)
						.select() // ask for the rows back so we can skip the refetch
						.throwOnError()
					const row = data?.[0]
					if (row) writeSyncedRow(cardsCollection, CardSchema.parse(row))
				})
			)
			return { refetch: false } // the rows are written back; skip the reload
		},
	})
)

// component — declare the optimistic intent, react to collection state
const { data: card } = useMyCard(phrase.id)

const setCardStatus = (status: CardStatus) => {
	if (!card) return
	const tx = cardsCollection.update(card.id, (draft) => {
		draft.status = status
	})
	tx.isPersisted.promise.then(
		() => toastSuccess(STATUS_TOAST_MESSAGES[status]),
		(err) => {
			toastError('Failed to update card status')
			console.error('rolled back', err)
		}
	)
}
```

The component subscribes to the collection via `useLiveQuery` (here through `useMyCard`), so the menu / button state reflects the optimistic value immediately and flips back if the server rejects.

See PR #623 (`cardsCollection.onUpdate` + review context-menu) for a worked example. See also the [TanStack DB optimistic-mutations skill](../node_modules/@tanstack/db/skills/db-core/mutations-optimistic/SKILL.md) for `createOptimisticAction` (multi-collection atomic mutations) and `createPacedMutations` (auto-save / debounce / throttle).

### When the optimistic state is worse than waiting

`collection.insert / update / delete` take `{ optimistic: false }`. The handler still runs and the transaction still resolves through `isPersisted.promise`; the row just never enters the optimistic layer, so it appears when the handler writes the server's row back.

Reach for it when a rollback would be more confusing than a wait. Friend requests are the case in the app today: `validate_friend_request_action` rejects several transitions, and a relationship that reads "friends" for a moment and then reads "unconnected" again is a worse thing to show than a button that waits and then reports the error. `useFriendRequestAction` writes non-optimistically and holds its own `pendingAction` for the spinner.

This is the exception, not the default. Most writes are safe to show immediately: the server accepts them, and the optimistic value is what the user came to see.

**Reasonable exceptions:**

- **Realtime sync handlers** writing supabase channel events into a collection (`writeSyncedRow(chatMessagesCollection, row)` inside a `postgres_changes` callback) — that's sync, not a mutation.
- **Mutations whose server-side transformation can't be predicted client-side** (e.g. FSRS scheduling on review submission) — evaluate case-by-case; may need `createOptimisticAction` with a best-guess optimistic update, or may legitimately keep the React Query pattern.

## Write the rows back, then skip the refetch

Returning all affected rows from the supabase API and writing them back to the collection with `writeSyncedRows` allows us to skip refetching the whole table after mutations (`{ refetch: false }`).

A collection holds two layers. The optimistic layer carries your change from the moment you make it. The synced layer holds what the server last told us. When the transaction ends, the optimistic entry stops being authoritative, and **the user sees whatever the synced layer holds**. `{ refetch: false }` skips the one step that would have updated it, so a handler that writes nothing back leaves the user looking at the pre-mutation row.

Trust the server's row over your local copy. "The optimistic value already matches the server" is an assumption, not a fact — check it with `should()` rather than build on it.

How badly this bites depends on how the mutation was started:

| Started with                          | Without a write-back                                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createOptimisticAction`              | **Always reverts**, the moment the action resolves. No refetch, no race.                                                                                                      |
| `collection.insert / update / delete` | Holds on the quiet path. Reverts as soon as any read for that key lands mid-flight — an explicit `utils.refetch()`, a sibling handler that omitted the flag, or a second tab. |

The second row is why this passes tests: nothing interferes, so the value sticks, and the handler looks correct.

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

`writeSyncedRow` upserts, so it **replaces** the row the collection holds rather than merging into it. That matters for a collection that reads a view but writes a base table: `phrasesCollection` reads `phrase_meta` and writes `phrase`, and the row the update returns has none of the columns the view computes. Spread the row you hold underneath the one you got back.

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

There is no helper for dropping a row, because nothing should drop one: a removal is a soft delete, which reaches the collection as an ordinary update.

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

Two rules follow:

- **Soft-delete the row instead of subscribing to DELETE.** A `deleted` flag turns the removal into an UPDATE, which Supabase scopes by RLS and sends with every column. The three upvote tables work this way: the button calls `collection.update(key, (draft) => { draft.deleted = !draft.deleted })`, the collection keeps the row, and live queries filter on `deleted`. No `onDelete` handler, and no special realtime binding — a removal is an ordinary update on both sides of the wire.
- **Don't subscribe to DELETE.** Comparing the frame's `uid` to the signed-in user would need `replica identity full`, which broadcasts every column of every deleted row on an RLS table. Soft-delete instead.

No collection subscribes to DELETE today. `chat_message` declines on both counts: its replica identity is the bare `id`, which says nothing about who owned the message, and chat messages are never deleted.

## Don't refetch entire tables to sync — return the row and write it back

`collection.utils.refetch()` is **a full table fetch** (`queryCollectionOptions.queryFn` re-runs `.from('…').select()` for the whole table). After a single-row mutation, this is wildly disproportionate: a refetch of `phrase_request` to confirm one new request pulls every request in the system.

The cheap alternative: make supabase or the RPC hand back the affected rows, and write them into the synced state directly.

- For direct supabase writes, append `.select()` (or `.select().single()`) to `insert / update / delete` calls. The post-mutation row(s) come back in the response.
- For RPCs, prefer ones that already `RETURN json_build_object(...)` with the affected rows (e.g. `create_comment_with_phrases`).
- Inside a `createOptimisticAction.mutationFn`, call `writeSyncedRows(collection, parsed)` with the server's returned row(s). The synced state is now correct without a full refetch, and the optimistic state drops cleanly when the action resolves.

Treat `collection.utils.refetch()` like `useEffect`: a code smell that needs a justification. **If you're about to add one, stop and check with the human first.** Usually one of these is the right move instead: pass client-generated IDs to the server so optimistic === synced; use `.select()` to get the row back; or change the RPC to return what you need. Legitimate uses do exist (e.g. picking up cascade-deleted rows on a parent delete) but they're rare and should be commented at the call site.

If you do call `refetch()` against a `startSync: false` user collection that's small (one-column-of-IDs tables like `*_upvote`), note that in a comment — it's much cheaper than refetching a public table, but still worth flagging.

## Deprecated pattern — do not use for new code, migrate when touching old code (tracked by the `transform` label)

```typescript
// ❌ useMutation calling supabase directly + manual local sync in onSuccess.
// React Query routes onSuccess errors to onError, so a successful DB write
// whose post-success sync throws surfaces as a misleading "Failed to X" toast.
const mutation = useMutation({
	mutationFn: async (values) => {
		const { data } = await supabase
			.from('phrase')
			.insert(values)
			.select()
			.throwOnError()
		return data[0]
	},
	onSuccess: (data) => {
		phrasesCollection.utils.writeInsert(PhraseSchema.parse(data))
		toast.success('Created!')
	},
	onError: (error) => {
		toast.error('Failed to create')
		console.log('Error', error)
	},
})
```

## Standard Form Pattern

Forms use **TanStack Form** through the app's composed hook — `useAppForm` from `src/components/form/form-hook.ts` (built with `createFormHook`). Do not import `useForm` from other form libraries; react-hook-form was removed.

1. Define a Zod schema for validation and pass it to the form's `validators`
2. Create the form with `useAppForm({ defaultValues, validators, onSubmit })`
3. Build fields from the pre-wired components registered in `form-hook.ts` — `form.AppField` with `EmailInput` / `PasswordInput` / `TextInput` / `TextareaInput`, plus `FormAlert` and `SubmitButton` form components
4. In `onSubmit`, call the collection mutation (`collection.insert/update`) and wire toasts to `tx.isPersisted.promise`
5. Copy an existing form (e.g. `src/components/requests/request-form.tsx`, `src/components/login-card-body.tsx`) rather than wiring from scratch

### Mutation Best Practices

- **Persistence lives on the collection** via `onInsert/onUpdate/onDelete` handlers; call sites use `collection.insert / update / delete` for optimistic local state
- **Throw from the handler** to roll the optimistic state back
- **Write the server's rows back before returning `{ refetch: false }`** — a handler that skips the refetch without writing the rows leaves the user looking at the pre-mutation row. See [Write the rows back, then skip the refetch](#write-the-rows-back-then-skip-the-refetch)
- **Wire success/error toasts to `Transaction.isPersisted.promise`** at the call site — `onSuccess` errors won't masquerade as mutation errors anymore
- **Subscribe to collection state with `useLiveQuery`** so the UI reflects the optimistic value (and snaps back on rollback) without ad-hoc local state
- For mutations whose server-side effect can't be predicted client-side, see `createOptimisticAction` in the TanStack DB optimistic-mutations skill

## Realtime Patterns

For friend requests and chat messages, use `useEffect` to subscribe:

```typescript
useEffect(() => {
	const channel = supabase
		.channel('chat_messages')
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'chat_message',
			},
			(payload) => {
				const row = ChatMessageSchema.parse(payload.new)
				writeSyncedRow(chatMessagesCollection, row)
			}
		)
		.subscribe()

	return () => {
		supabase.removeChannel(channel)
	}
}, [])
```

## Query Configuration

Default query settings (from `src/lib/query-client.ts`): `staleTime` 2 minutes, `gcTime` 20 minutes, `refetchOnWindowFocus: false`, `refetchOnMount: false`. Collections handle most caching, so these are relatively conservative.

## Feed System

The feed is the one feature that uses `useInfiniteQuery` instead of collections, due to cursor-based pagination:

- **Query hooks**: `useFeedLang(lang)`, `useFilteredFeedLang(lang, filterType)`, `useFriendsFeedLang(lang)`, `usePopularFeedLang(lang)` — each has a filtered variant
- **Cursor**: `created_at` timestamp, 20 items per page, popular feed also sorts by `popularity` descending
- **Cache invalidation**: `useInvalidateFeed()` manually resets all feed query caches after mutations
- **Feed types**: 'request', 'playlist', 'phrase'
- **Client-side folding**: Removes child phrases from feed to avoid duplication (see `$lang.feed.tsx`)
