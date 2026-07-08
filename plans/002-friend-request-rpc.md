# Plan 002: Rewrite friend-request actions around an RPC that returns the new relationship state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1c4b60ef..HEAD -- src/features/social/ supabase/schemas/base.sql scenetest/scenes/social.spec.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-social-profile-scene-specs.md (characterization coverage must exist first)
- **Category**: tech-debt / migration

- **Planned at**: commit `1c4b60ef`, 2026-07-08

## Why this matters

Friend relationships are stored as an append-only event log (`friend_request_action`) whose current state is derived by the `friend_summary` view. The client today INSERTs a raw action row and never learns the outcome: a `BEFORE INSERT` trigger can silently transform the action (mutual invite → accept), the success toast can therefore lie ("Friend request sent 👍" when you actually just became friends), and collection sync happens only via a side channel — a realtime subscription that reacts to the INSERT by refetching the **entire** `friend_summary` view. If the realtime channel is down, the write succeeds and the UI never updates.

This plan adds an RPC that performs the action and returns the resulting `friend_summary` row, so the acting client can write the confirmed state directly into its collection, toast accurately based on what actually happened, and drop the full-table refetch. This matches the repo's stated philosophy (CLAUDE.md: "always return full objects from RPCs") and the collection-handler direction tracked under the `transform` label.

## Current state

- `src/features/social/hooks.ts:59-94` — `useFriendRequestAction(uid_for)`: a `useMutation` that raw-INSERTs into `friend_request_action`:

  ```ts
  // hooks.ts:63-76
  return useMutation({
  	mutationKey: ['user', uid_by, 'friend_request_action', uid_for],
  	mutationFn: async (action_type: string) => {
  		await supabase
  			.from('friend_request_action')
  			.insert({
  				uid_less,
  				uid_more,
  				uid_by,
  				uid_for,
  				action_type,
  			} as TablesInsert<'friend_request_action'>)
  			.throwOnError()
  	},
  	onSuccess: (_, variable) => {
  		if (variable === 'invite') toastSuccess('Friend request sent 👍')
  		// ... toasts keyed on the SUBMITTED action, not the actual outcome
  ```

  Note: no collection sync happens in this mutation at all.

- `src/features/social/hooks.ts:361-414` — `useSocialRealtime()`: subscribes to ALL `friend_request_action` INSERTs (no `filter:` — contrast with `src/features/notifications/hooks.ts:86` which uses `filter: 'uid=eq.${userId}'`), casts the payload with `as`, toasts on accepts, then:

  ```ts
  // hooks.ts:385
  void friendSummariesCollection.utils.refetch()
  ```

  It also handles `chat_message` INSERTs and logs message content: `console.log('new chat', newMessage)` (hooks.ts:401) — PII in console, remove while in here.

- `src/features/social/collections.ts:12-32` — `friendSummariesCollection`: `queryCollectionOptions`, `queryKey: ['user', 'friend_summary']`, fetches the whole `friend_summary` view, `getKey: (item) => \`${item.uid_less}--${item.uid_more}\``, `startSync: false`, schema `FriendSummarySchema`(in`src/features/social/schemas.ts`).

- `supabase/schemas/base.sql:1124-1189` — trigger fn `validate_friend_request_action()` (SECURITY DEFINER, `BEFORE INSERT`): validates state transitions against `friend_summary` and **rewrites `NEW.action_type` from 'invite' to 'accept' on mutual invite**. Raises exceptions like `'Already friends'`, `'Cannot accept: no pending friend request'`.

- `supabase/schemas/base.sql:1520-1554` — the `friend_summary` view (`security_invoker = true`): `DISTINCT ON (uid_less, uid_more)` over `friend_request_action` ordered by `created_at desc`. Its columns are a **pure function of the latest action row**:
  - `status`: `accept`→`'friends'`, `invite`→`'pending'`, `decline|cancel|remove`→`'unconnected'`
  - `most_recent_created_at` = `created_at`, `most_recent_uid_by` = `uid_by`, `most_recent_uid_for` = `uid_for`, `most_recent_action_type` = `action_type`
  - `uid` = the OTHER party (`uid_for` if `uid_by = auth.uid()`, else `uid_by`)

- RLS (base.sql:2930, 2979): SELECT on `friend_request_action` requires `auth.uid() IN (uid_by, uid_for)`; INSERT requires `auth.uid() = uid_by` (plus uid_less/uid_more consistency checks).

- Exemplar RPC that returns affected rows as json: `create_comment_with_phrases` at `supabase/schemas/base.sql:306-357` (`returns json`, plain `language plpgsql`, `RETURNING * INTO`, final `json_build_object(...)` with `row_to_json`). Match its style.

- Exemplar client consumption of such an RPC: `src/components/comments/comment-dialog.tsx:451-471` (rpc call → Zod-parse the returned rows → `collection.utils.writeInsert`).

## Commands you will need

| Purpose                             | Command                                      | Expected on success                                         |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| Start Supabase                      | `supabase start`                             | services running                                            |
| Apply schema change locally         | `supabase db reset` (after adding migration) | exit 0, migrations apply                                    |
| Create migration from local changes | `pnpm run migrate`                           | new file in `supabase/migrations/`                          |
| Regenerate base schema              | `pnpm run seeds:schema`                      | `supabase/schemas/base.sql` updated — review diff carefully |
| Regenerate TS types                 | `pnpm run types`                             | `src/types/supabase.ts` updated                             |
| Typecheck                           | `pnpm check`                                 | exit 0                                                      |
| Lint                                | `pnpm lint`                                  | exit 0                                                      |
| Scene suite (characterization)      | `pnpm scene scenetest/scenes/social.spec.md` | all pass                                                    |
| Format SQL                          | `pnpm format` (prettier handles SQL only)    | exit 0                                                      |

## Scope

**In scope**:

- New migration in `supabase/migrations/` (via `pnpm run migrate`) adding `perform_friend_request_action`
- `supabase/schemas/base.sql` (regenerated — review the diff for unintended deletions, e.g. realtime table config; CLAUDE.md warns about this)
- `src/types/supabase.ts` (regenerated)
- `src/features/social/hooks.ts` (the mutation + the realtime handler)
- `src/features/social/schemas.ts` (add the derivation helper `friendSummaryFromAction` if placed here)
- `scenetest/scenes/social.spec.md` (remove any "known quirk, fixed by plan 002" pins from plan 001; assert the corrected toast)

**Out of scope** (do NOT touch):

- The `validate_friend_request_action` trigger and the `friend_summary` view — they stay as the integrity backstop. Do NOT drop or weaken them.
- Direct-INSERT RLS policies on `friend_request_action` — leave the direct path allowed for now (removing it is a follow-up decision for the maintainer).
- `chat_message` mutations and `useSendMessage` — separate concern.
- Any other collection or feature.

## Git workflow

**This is migration-track work** (CLAUDE.md "Deployment Strategy"). Migrations only reach `main` through a `next-<version>` branch. At planning time no `next-<version>` branch is open; `package.json` version is `0.28.0` and the latest changelog heading is `v0.28`, so the open migration branch should be `next-0.29` (or `next-0.28.1` if the operator prefers a patch — ask if unsure).

- Create branch `next-0.29` from `main` if it does not exist; otherwise branch `advisor/002-friend-request-rpc` FROM `next-0.29` and target it.
- CI globs already cover `next-*` (`.github/workflows/test.yaml`) — do not rename outside that pattern.
- Do NOT push, open a PR, bump the version, or write the changelog entry — those happen at release cut, by the operator.

## Steps

### Step 1: Write the RPC

Add (locally, via Supabase Studio or a SQL file applied with `supabase db reset` after `pnpm run migrate` — follow the repo's Database Workflow: change locally first, then `pnpm run migrate` to diff) the function:

```sql
create or replace function public.perform_friend_request_action(
	p_uid_for uuid,
	p_action text
) returns json language plpgsql as $$
DECLARE
	v_uid_by uuid := auth.uid();
	v_row friend_request_action;
BEGIN
	IF v_uid_by IS NULL THEN
		RAISE EXCEPTION 'Not authenticated';
	END IF;
	IF p_uid_for = v_uid_by THEN
		RAISE EXCEPTION 'Cannot friend yourself';
	END IF;

	INSERT INTO friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
	VALUES (
		least(v_uid_by, p_uid_for),
		greatest(v_uid_by, p_uid_for),
		v_uid_by,
		p_uid_for,
		p_action::friend_request_response
	)
	RETURNING * INTO v_row;
	-- v_row.action_type reflects the BEFORE-INSERT trigger's transformation
	-- (mutual invite → accept), so the client learns what actually happened.

	RETURN json_build_object('friend_request_action', row_to_json(v_row));
END;
$$;
```

Notes:

- `language plpgsql` WITHOUT `security definer` — the INSERT runs as the caller, so the existing RLS INSERT policy still applies. The trigger still fires and can still raise its validation exceptions; they propagate to the client as errors (same as today).
- Grant execute to `authenticated` (match how other functions are granted in `base.sql`, e.g. the grants around line 3692).
- Return the **action row**, not a hand-built summary row: the `friend_summary` view is a pure function of the latest action row, so the client derives the summary with a shared helper (step 2). This keeps the SQL simple and gives the realtime path (which only has the action row) the exact same code path.

**Verify**: in Supabase Studio SQL editor (http://localhost:54323), as a test, `select perform_friend_request_action('<some-seed-uid>', 'invite');` → returns json with the inserted row; a second identical call → error `Friend request already sent` (trigger fired). Then reset: `supabase db reset`.

### Step 2: Add the derivation helper

In `src/features/social/schemas.ts`, add and export:

```ts
/** Mirror of the friend_summary view: the view is DISTINCT ON latest action,
 *  so any new action row fully determines the pair's new summary row.
 *  If the view definition changes, this must change with it. */
export function friendSummaryFromAction(
	action: Tables<'friend_request_action'>,
	myUid: uuid
): FriendSummaryType {
	return FriendSummarySchema.parse({
		uid_less: action.uid_less,
		uid_more: action.uid_more,
		status:
			action.action_type === 'accept'
				? 'friends'
				: action.action_type === 'invite'
					? 'pending'
					: 'unconnected',
		most_recent_created_at: action.created_at,
		most_recent_uid_by: action.uid_by,
		most_recent_uid_for: action.uid_for,
		most_recent_action_type: action.action_type,
		uid: action.uid_by === myUid ? action.uid_for : action.uid_by,
	})
}
```

(Adjust field names/types to `FriendSummarySchema` exactly — read it in `schemas.ts` first. Import types per repo convention: intra-feature relative imports.)

**Verify**: `pnpm check` → exit 0.

### Step 3: Regenerate migration, schema, types

Follow the repo's Database Workflow:

1. `pnpm run migrate` → creates `supabase/migrations/<timestamp>_new_migration.sql`; rename descriptively (e.g. `..._perform_friend_request_action.sql`) and confirm it contains only the new function + grant.
2. `pnpm run seeds:schema` → review `git diff supabase/schemas/base.sql` — it must show ONLY the added function/grants; revert any unrelated deletions (realtime config etc.).
3. `pnpm run types` → `src/types/supabase.ts` gains the `perform_friend_request_action` Functions entry.
4. `pnpm format` for the SQL.

**Verify**: `supabase db reset` → exit 0; `pnpm check` → exit 0.

### Step 4: Rewire `useFriendRequestAction`

In `src/features/social/hooks.ts:59-94`, replace the raw insert with the RPC and sync the collection from the returned row:

```ts
export const useFriendRequestAction = (uid_for: uuid) => {
	const uid_by = useUserId()
	return useMutation({
		mutationKey: ['user', uid_by, 'friend_request_action', uid_for],
		mutationFn: async (action_type: string) => {
			const { data, error } = await supabase.rpc(
				'perform_friend_request_action',
				{ p_uid_for: uid_for, p_action: action_type }
			)
			if (error) throw error
			return (
				data as { friend_request_action: Tables<'friend_request_action'> }
			).friend_request_action
		},
		onSuccess: (row) => {
			const summary = friendSummaryFromAction(row, uid_by!)
			friendSummariesCollection.utils.writeUpsert(summary)
			// Toast on the ACTUAL action (trigger may transform invite → accept)
			if (row.action_type === 'invite') toastSuccess('Friend request sent 👍')
			if (row.action_type === 'accept')
				toastSuccess('Accepted invitation. You are now connected 👍')
			if (row.action_type === 'decline')
				toastNeutral('Declined this invitation')
			if (row.action_type === 'cancel')
				toastNeutral('Cancelled this invitation')
			if (row.action_type === 'remove')
				toastNeutral('You are no longer friends')
		},
		onError: (error) => {
			console.log(`Friend request action failed:`, error)
			toastError(`Something went wrong with this interaction`)
		},
	})
}
```

- If `friendSummariesCollection.utils.writeUpsert` does not exist in the installed `@tanstack/query-db-collection` version, use: look up `friendSummariesCollection.get(\`${summary.uid_less}--${summary.uid_more}\`)`and call`writeUpdate`if present,`writeInsert` otherwise.
- This keeps `useMutation` — acceptable here because the server-side transformation can't be predicted client-side (CLAUDE.md lists exactly this as a legitimate exception), and now the sync uses the server's returned row (the endorsed `writeX` pattern), not a refetch.

**Verify**: `pnpm check` → exit 0; `pnpm scene scenetest/scenes/social.spec.md` → all pass.

### Step 5: Fix the realtime handler

In `useSocialRealtime` (`hooks.ts:361-414`):

1. Replace the `as` cast + full refetch for friend actions with schema-parse + derived upsert:

   ```ts
   ;(payload) => {
   	const action = FriendRequestActionSchema.parse(payload.new) // add this Zod schema in schemas.ts if absent
   	if (action.action_type === 'accept' && action.uid_for === userId)
   		toastSuccess('Friend request accepted')
   	if (action.action_type === 'accept' && action.uid_by === userId)
   		toastSuccess('You are now connected')
   	friendSummariesCollection.utils.writeUpsert(
   		friendSummaryFromAction(action, userId)
   	)
   }
   ```

2. Remove `console.log('new chat', newMessage)` at hooks.ts:401 (PII).
3. Realtime `postgres_changes` respects RLS, so the subscriber only receives rows where they are `uid_by` or `uid_for` — a `filter:` can't express OR, so leave the subscription unfiltered but add a one-line comment saying RLS scopes delivery.
4. Wrap each handler body in try/catch that `console.error`s and returns — a malformed payload must not throw inside the channel callback. (Note: the acting client will now receive both the RPC return AND its own realtime event; `writeUpsert` of the same derived row is idempotent, so this is fine — add a comment saying so.)

**Verify**: `pnpm check` → exit 0; `grep -n "utils.refetch" src/features/social/hooks.ts` → only the commented-out block at ~line 307 (or none, if you also delete that dead block — do delete it); `grep -n "console.log" src/features/social/hooks.ts` → no chat-payload logging.

### Step 6: Update the characterization scenes

If plan 001 pinned the mutual-invite quirk (`<!-- known quirk, fixed by plan 002 -->`), update that scene: mutual invite should now toast "Accepted invitation. You are now connected 👍" (or the accept-side realtime toast) instead of "Friend request sent 👍". Remove the pin comment.

**Verify**: `pnpm scene scenetest/scenes/social.spec.md` → all pass. Run twice for cleanup idempotency.

## Test plan

- Characterization: the plan-001 scenes in `scenetest/scenes/social.spec.md` must pass before AND after (with only the mutual-invite toast assertion changing).
- New unit test: `src/features/social/friend-summary-from-action.test.ts` (vitest, model after `src/features/notifications/schemas.test.ts`) covering: invite→pending, accept→friends, decline/cancel/remove→unconnected, `uid` resolution for both directions. `pnpm test:unit` → passes.
- Manual multi-tab check (optional, note result): two browsers as `learner`/`friend`, invite from one, watch the other's list update via realtime without reload.

## Done criteria

- [ ] `supabase db reset` exits 0 with the new migration
- [ ] `git diff supabase/schemas/base.sql` shows only the new function + grants
- [ ] `pnpm check`, `pnpm lint`, `pnpm test:unit` all exit 0
- [ ] `pnpm scene scenetest/scenes/social.spec.md` passes twice consecutively
- [ ] `grep -n "from('friend_request_action')" src/` shows no client INSERT path remaining (`.insert(` on that table gone from `src/`)
- [ ] `grep -rn "utils.refetch()" src/features/social/` returns no live (uncommented) matches
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 is not DONE in `plans/README.md` (the characterization net must exist first).
- `FriendSummarySchema`'s fields do not match the view columns listed in "Current state" (the view has drifted — the derivation helper would be wrong).
- The trigger's exception messages surface to users in a worse way via RPC than via direct insert (check the error shape in the network tab; if PostgREST wraps it unusably, report).
- `writeUpsert` is absent AND the get-then-write fallback fails typecheck (collection utils API drift).
- The `pnpm run migrate` diff contains anything besides the new function + grant.

## Maintenance notes

- **The derivation helper duplicates the view's case-map.** If `friend_summary` ever changes shape or logic, `friendSummaryFromAction` must change in lockstep — the comment on the helper says so; a reviewer should check both in any future friend-schema PR.
- Follow-up decision (deliberately out of scope): revoke direct INSERT on `friend_request_action` from `authenticated` so the RPC is the single write path. Do this only after confirming nothing else inserts directly (as of this plan, only the rewritten hook did).
- The acting client double-receives its own action (RPC return + realtime event). Idempotent upsert makes this safe; if toasts ever move into the realtime handler wholesale, dedupe by checking `action.uid_by === userId` first.
- Release: this rides `next-0.29`; version bump + changelog happen at release cut, not in this plan.
