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
				transaction.mutations.map((m) =>
					supabase
						.from('user_card')
						.update(m.changes)
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			return { refetch: false } // optimistic value matches server; skip reload
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

- **Realtime sync handlers** writing supabase channel events into a collection (`chatMessagesCollection.utils.writeInsert(...)` inside a `postgres_changes` callback) — that's sync, not a mutation.
- **Mutations whose server-side transformation can't be predicted client-side** (e.g. FSRS scheduling on review submission) — evaluate case-by-case; may need `createOptimisticAction` with a best-guess optimistic update, or may legitimately keep the React Query pattern.

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
- **Throw from the handler** to roll the optimistic state back; **return `{ refetch: false }`** from a `queryCollectionOptions` handler when the optimistic value already matches what the server confirmed (skip the post-handler full refetch)
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
				chatMessagesCollection.utils.writeInsert(
					ChatMessageSchema.parse(payload.new)
				)
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
