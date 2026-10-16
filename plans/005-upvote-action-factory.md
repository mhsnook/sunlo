# Plan 005: Extract a shared upvote action factory for comments, playlists, and requests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1c4b60ef..HEAD -- src/components/comments/upvote-comment-button.tsx src/components/playlists/upvote-playlist-button.tsx src/components/requests/upvote-request-button.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt

- **Planned at**: commit `1c4b60ef`, 2026-07-08

## Why this matters

Three files implement the same upvote toggle — `upvote-comment-button.tsx` (104 lines), `upvote-playlist-button.tsx` (109), `upvote-request-button.tsx` (109) — each pairing a `createOptimisticAction` (optimistic ±1 count + upvote-row insert/delete, RPC call, trusted writeback) with a small button component. They differ only in: entity collection, upvote collection, RPC name/params, id field name, and toast copy. Any change to vote behavior must be made three times and the copies are already drifting on details like toast usage. One factory makes the behavior single-sourced.

## Current state

- `src/components/requests/upvote-request-button.tsx:23-60` — the canonical shape:

  ```ts
  type UpvoteInput = {
  	requestId: uuid
  	action: 'add' | 'remove'
  	currentCount: number
  }

  const setRequestUpvote = createOptimisticAction<UpvoteInput>({
  	onMutate: ({ requestId, action, currentCount }) => {
  		const nextCount =
  			action === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1)
  		phraseRequestsCollection.update(requestId, (draft) => {
  			draft.upvote_count = nextCount
  		})
  		if (action === 'add') {
  			phraseRequestUpvotesCollection.insert({ request_id: requestId })
  		} else {
  			phraseRequestUpvotesCollection.delete(requestId)
  		}
  	},
  	mutationFn: async ({ requestId, action, currentCount }) => {
  		const { error } = await supabase.rpc('set_phrase_request_upvote', {
  			p_request_id: requestId,
  			p_action: action,
  		})
  		if (error) throw error
  		// Trust the optimistic ±1 count. Drifts by 1 in the 'no_change' edge
  		// case (e.g. server already had us upvoted from another tab) and
  		// self-corrects on next stale refetch. Avoids a full phrase_request
  		// table refetch on every click.
  		const nextCount =
  			action === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1)
  		phraseRequestsCollection.utils.writeUpdate({
  			id: requestId,
  			upvote_count: nextCount,
  		})
  		if (action === 'add') {
  			phraseRequestUpvotesCollection.utils.writeInsert({
  				request_id: requestId,
  			})
  		} else {
  			phraseRequestUpvotesCollection.utils.writeDelete(requestId)
  		}
  	},
  })
  ```

- `src/components/comments/upvote-comment-button.tsx:23-58` — same shape over `commentsCollection` + `commentUpvotesCollection`, RPC `set_comment_upvote` (confirm exact name/params by reading the file), fk field `comment_id`.
- `src/components/playlists/upvote-playlist-button.tsx:23-60` — same shape over `phrasePlaylistsCollection` + `phrasePlaylistUpvotesCollection`, playlist RPC, fk field `playlist_id`.
- Upvote collections use the foreign key as `getKey` (CLAUDE.md: "upvote collections use the foreign key, e.g. `item.comment_id`") — that's why `.delete(entityId)` works.
- Each file also has a button component using `useHasXUpvote` hooks, `useRequireAuth` (`src/hooks/use-require-auth.ts`), `Button` with `variant={hasUpvote ? 'soft' : 'ghost'}` (CLAUDE.md button conventions: ghost → soft for active state).

Read all three files fully before extracting — the plan's excerpts cover the request variant; confirm the exact deltas in the other two (toast calls, count field names, hook names).

## Commands you will need

| Purpose   | Command                                                                                                                 | Expected on success |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                                                                                            | exit 0              |
| Lint      | `pnpm lint`                                                                                                             | exit 0              |
| Scenes    | `pnpm scene scenetest/scenes/comment-crud.spec.md scenetest/scenes/requests.spec.md scenetest/scenes/playlists.spec.md` | pass                |

## Scope

**In scope**:

- `src/lib/create-upvote-action.ts` (create)
- The three button files (refactor to consume the factory)

**Out of scope** (do NOT touch):

- The three RPCs / any SQL — client-only refactor.
- The upvote collections' definitions in `src/features/*/collections.ts`.
- Any visual/UX change to the buttons — markup, variants, testids stay byte-identical where possible.
- Plan 003's files.

## Git workflow

- Branch: `advisor/005-upvote-action-factory`, based on `main`. Fast track.
- Single commit, e.g. `Extract shared upvote action factory` (matches repo log style, cf. `e6602d6e "Extract a general UserAvatar component"`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the factory

Create `src/lib/create-upvote-action.ts` exporting roughly:

```ts
export function createUpvoteAction<K extends string>(config: {
	entityCollection: /* Collection with { id: uuid; upvote_count: number } rows */
	upvoteCollection: /* Collection keyed by the fk */
	fkField: K // 'request_id' | 'comment_id' | 'playlist_id'
	rpcName: string
	rpcIdParam: string // 'p_request_id' | ...
}) {
	return createOptimisticAction<{ id: uuid; action: 'add' | 'remove'; currentCount: number }>({ ... })
}
```

Preserve the "trust the optimistic ±1" comment and behavior verbatim (it encodes a real design decision). Typing the collections generically can get fiddly with TanStack DB's collection generics — it is acceptable to type the config params with the concrete collection types via a union or `typeof`-based generics, or to accept slight `as` loosening INSIDE the factory only; do not loosen types at call sites.

**Verify**: `pnpm check` → exit 0.

### Step 2: Convert the three buttons

Each button file keeps its component (markup untouched) and replaces its local `createOptimisticAction` block with:

```ts
const setRequestUpvote = createUpvoteAction({
	entityCollection: phraseRequestsCollection,
	upvoteCollection: phraseRequestUpvotesCollection,
	fkField: 'request_id',
	rpcName: 'set_phrase_request_upvote',
	rpcIdParam: 'p_request_id',
})
```

Keep per-entity toast copy at the call site (in the click handler / `.then()` where it lives today) — copy differences are intentional per-surface UX, not drift to be unified.

**Verify** after each file: `pnpm check` → exit 0.

### Step 3: Behavior check

**Verify**: `pnpm scene scenetest/scenes/comment-crud.spec.md scenetest/scenes/requests.spec.md scenetest/scenes/playlists.spec.md` → pass. Manually toggle an upvote on/off on a request and confirm count moves ±1 and the button variant flips ghost↔soft.

## Test plan

- Regression via the three scene files above (they exercise the surfaces containing the buttons).
- If any scene lacks an explicit upvote assertion, note that in the report — do NOT add new scenes in this plan (keep it a pure refactor); flag it as a candidate follow-up.

## Done criteria

- [ ] `src/lib/create-upvote-action.ts` exists; all three buttons consume it
- [ ] `grep -c "createOptimisticAction" src/components/comments/upvote-comment-button.tsx src/components/playlists/upvote-playlist-button.tsx src/components/requests/upvote-request-button.tsx` → 0 for each
- [ ] `pnpm check`, `pnpm lint` exit 0; the three scene files pass
- [ ] `git diff` on the three button files shows no markup/testid/variant changes
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The three implementations differ by more than the parameterizable deltas listed (e.g. one syncs an extra collection or handles a `no_change` RPC return differently) — genuine behavioral divergence needs a human call on which is correct.
- Generic typing forces `as any` at CALL sites or weakens the row types consumers see.
- An upvote RPC returns data the current code ignores but the factory would need (signature mismatch across the three RPCs).

## Maintenance notes

- Future entity upvotes (e.g. phrases) should use this factory — a reviewer seeing a fourth hand-rolled upvote action should point here.
- The optimistic-count drift-by-1 edge case (`no_change` from another tab) is inherited by all three; if it ever bothers users, fix it once in the factory (have the RPCs return the authoritative count).
