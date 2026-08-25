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
						.select() // ask for the row back — see "The { refetch: false } contract"
						.throwOnError()
					for (const row of data ?? []) cardsCollection.utils.writeUpdate(row)
				})
			)
			return { refetch: false } // synced layer is now correct; skip the reload
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

**Reasonable exceptions:**

- **Realtime sync handlers** writing supabase channel events into a collection (`writeRealtimeRow(chatMessagesCollection, ...)` inside a `postgres_changes` callback) — that's sync, not a mutation.
- **Mutations whose server-side transformation can't be predicted client-side** (e.g. FSRS scheduling on review submission) — evaluate case-by-case; may need `createOptimisticAction` with a best-guess optimistic update, or may legitimately keep the React Query pattern.

## The `{ refetch: false }` contract

`{ refetch: false }` reads like a performance flag. It is a promise: **this handler has already made the synced layer correct.** Keep the promise by writing the server's returned rows into the synced layer, or omit the flag and let the collection reload.

A collection holds two layers. The optimistic layer carries your change from the moment you make it. The synced layer holds what the server last told us. When the transaction ends, the optimistic entry stops being authoritative, and **whatever the synced layer holds is what the user is left with**. `{ refetch: false }` skips the one step that would have updated it, so if the handler writes nothing back, the synced layer still holds the pre-mutation row.

Trust the server's row over your local copy. "The optimistic value already matches the server" is an assumption, not a fact — check it with `should()` rather than build on it.

How badly this bites depends on how the mutation was started:

| Started with                          | Without a write-back                                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createOptimisticAction`              | **Always reverts**, the moment the action resolves. No refetch, no race.                                                                                                      |
| `collection.insert / update / delete` | Holds on the quiet path. Reverts as soon as any read for that key lands mid-flight — an explicit `utils.refetch()`, a sibling handler that omitted the flag, or a second tab. |

The second row is why this passes tests: nothing interferes, so the value sticks, and the handler looks correct.

### What to write back, per operation

```typescript
// update — .select() the row, then writeUpdate it
const { data } = await supabase
	.from('phrase')
	.update(changes)
	.eq('id', m.original.id)
	.select()
	.throwOnError()
for (const row of data ?? []) phrasesCollection.utils.writeUpdate(row)

// insert — server columns win, the optimistic row fills the rest
const { data } = await supabase
	.from('phrase')
	.insert(row)
	.select()
	.single()
	.throwOnError()
phrasesCollection.utils.writeInsert({ ...m.modified, ...data })

// delete — nothing to fetch, just record it
playlistPhraseLinksCollection.utils.writeDelete(m.original.id)
```

`writeUpdate` **merges** its argument over the current synced row. That matters for a collection that reads a view but writes a base table — `phrasesCollection` (`phrase_meta` → `phrase`). The base-table row the write returns has no view-derived columns, and the merge keeps the ones already there.

`writeInsert` and `writeUpsert` **replace** rather than merge. On a view-backed collection, spread the optimistic row underneath (as above) so the view-derived columns are not blanked out.

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
	!row ||
		Object.entries(changes).every(
			([k, v]) => k === 'updated_at' || row[k] === v
		),
	{ submitted: changes, returned: row }
)
if (row) cardsCollection.utils.writeUpdate(row)
```

`should()` reports to the observer panel in dev and test, and the Vite plugin strips it from production builds. See `docs/testing.md`.

### Realtime is a backstop, not the mechanism

A realtime frame arrives after the database commits, so it carries the truth and is safe to write into the synced layer. But a collection that is only correct once the frame lands is wrong until then, and stays wrong whenever the socket is down. Make the handler correct on its own; let realtime cover the writes made by other clients and other devices.

Use `writeRealtimeRow(collection, key, row)` and `deleteSyncedRow(collection, key)` (`src/lib/collections/realtime-row.ts`) for INSERT and UPDATE frames. It upserts, because a frame can arrive for a row this client never fetched and `writeUpdate` throws on a key it cannot find. It also skips the write when every field already matches, which is this client's own mutation echoing back — writing it would re-run every live query for nothing.

**INSERT and UPDATE frames are RLS-scoped; DELETE frames are not.** Supabase tests each subscriber's policies against the new row, so an insert or update reaches you only if you could have fetched that row yourself. It cannot do the same for a delete, because the row is already gone by then. So every delete on a published table reaches every subscriber of that table, whoever owned the row.

A delete frame also carries only the table's replica identity — the primary key, unless the table is set to `replica identity full`. Every other column is absent.

Two rules follow:

- **Soft-delete the row instead of subscribing to DELETE.** A `deleted` flag turns the removal into an UPDATE, which Supabase scopes by RLS and sends with every column. The three upvote tables work this way (#768): `onDelete` writes `deleted: true`, the realtime handler routes any frame carrying `deleted` to `deleteSyncedRow(collection, key)`, and the collection loads live rows only.
- **Subscribe to DELETE only when the replica identity is safe to show every subscriber**, and then compare its `uid` to the signed-in user and drop the frame if it does not match. Do not reach for `replica identity full` to widen the payload on an RLS table: that broadcasts every column of every deleted row. The `collection.get(key)` guard `deleteSyncedRow` applies is not enough on its own — it stops the throw, not the deletion of your own row on someone else's frame.

No collection subscribes to DELETE today. `chat_message` declines on both counts: its replica identity is the bare `id`, which says nothing about who owned the message, and chat messages are never deleted.

## Don't refetch entire tables to sync — return the row and `writeInsert` / `writeUpdate` / `writeDelete`

`collection.utils.refetch()` is **a full table fetch** (`queryCollectionOptions.queryFn` re-runs `.from('…').select()` for the whole table). After a single-row mutation, this is wildly disproportionate: a refetch of `phrase_request` to confirm one new request pulls every request in the system.

The cheap alternative: make supabase or the RPC hand back the affected rows, and write them into the synced state directly.

- For direct supabase writes, append `.select()` (or `.select().single()`) to `insert / update / delete` calls. The post-mutation row(s) come back in the response.
- For RPCs, prefer ones that already `RETURN json_build_object(...)` with the affected rows (e.g. `create_comment_with_phrases`).
- Inside a `createOptimisticAction.mutationFn`, call `collection.utils.writeInsert(parsed)` / `writeUpdate(parsed)` / `writeDelete(key)` with the server's returned row(s). The synced state is now correct without a full refetch, and the optimistic state drops cleanly when the action resolves.

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
- **Only return `{ refetch: false }` if the handler wrote the server's rows into the synced layer** — the flag is a promise, not a performance hint. See [The `{ refetch: false }` contract](#the--refetch-false--contract)
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
				writeRealtimeRow(chatMessagesCollection, row.id, row)
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
