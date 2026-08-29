# Plan 001: Implement the 9 stubbed social & profile scene specs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1c4b60ef..HEAD -- scenetest/scenes/social.spec.md scenetest/scenes/profile.spec.md scenetest/TEST_IDS.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests

- **Planned at**: commit `1c4b60ef`, 2026-07-08

## Why this matters

`scenetest/scenes/social.spec.md` and `scenetest/scenes/profile.spec.md` contain 9 scenes that are login-only stubs, ported from `e2e/mutations/*.spec.ts` tests that were already `test.skip`ped. The legacy `e2e/` directory is being decommissioned (tracked by the `transform` label), so when it is deleted, the friend-request, unfriend, chat-recommendation, and profile-edit flows will have **zero** end-to-end coverage. Separately, a rewrite of the friend-request mutation path is planned (see `plans/002-friend-request-rpc.md`) — these scenes must land **first** as characterization coverage: they assert user-visible outcomes (toasts, list state) that must survive the rewrite unchanged.

## Current state

- `scenetest/scenes/social.spec.md` — 5 stub scenes. Each looks like:

  ```markdown
  # learner sends and cancels a friend request

  learner:

  - login
    // STUB — ported from e2e/mutations/social.spec.ts (test.skip). To implement:
    // - navigate to friend search / invite
    // - send two friend requests
    // - verify both requests appear on /friends
    // - cancel one request; verify it is gone
    // DB-state agreement belongs in inline serverChecks on the social
    // collections, not in this scene.
  ```

  The five scenes (by heading) are:
  1. `learner sends and cancels a friend request`
  2. `friend accepts a friend request and removes a friend`
  3. `learner declines or removes a friend`
  4. `learner sends a recommendation message to a friend`
  5. `learner sends a phrase request to a friend`

- `scenetest/scenes/profile.spec.md` — 4 stub scenes with the same STUB comment shape (ported from `e2e/mutations/profile.spec.ts`). Read the file for the intended behavior in each stub's comments.

- `scenetest/scenes/friends.spec.md` — already covers friend-**search** UI (open/search/close overlay) but no mutations. Do not duplicate its coverage.

- The relevant DB objects (for cleanup directives): friend relations are an append-only event log in table `friend_request_action` (columns `uid_less`, `uid_more`, `uid_by`, `uid_for`, `action_type`, `created_at`); the current relation state is the `friend_summary` view (latest action per pair). Chat messages live in `chat_message` (`sender_uid`, `recipient_uid`). A `BEFORE INSERT` trigger validates state transitions, so cleanup MUST delete the pair's action rows entirely (returning the pair to 'unconnected'), not insert compensating actions.

- Actors are defined in `scenetest/actors/default.ts`: `learner` (main user with data), `friend` (secondary user for multi-actor flows), plus `learner2`, `learner3`. Seed data may already include a pending request between specific actors — read `supabase/seed-*.sql` files (loaded alphabetically) to check what friend/chat state is seeded before deciding whether a scene needs a `setup:` directive.

## Repo conventions that apply (inline, from CLAUDE.md)

- Scene DSL commands: `openTo <path>`, `see <selector>`, `notSee <selector>`, `seeText <text>`, `seeToast <selector>`, `click <selector>`, `typeInto <selector> <value>`, `up` (settle/reset scope), `login` (macro), `scope <selector>`.
- `typeInto`: multi-word values need single quotes (`typeInto input 'hello world'`); single words don't. `seeText` takes the rest of the line literally, no quotes.
- `seeToast` is scope-affected — `up` first if scoped inside a dialog.
- Toasts use generic testids: `toast-success`, `toast-error`, `toast-neutral` (no per-action ids). Friend-request actions fire: invite → success toast, accept → success, decline/cancel/remove → neutral (see `src/features/social/hooks.ts:77-84`).
- Selectors resolve to `data-testid`; space-separated selectors drill into scopes: `decks-list-grid hin deck-link` = container > `data-key` > child.
- Template variables: `[self.email]`, `[learner.key]`, `[friend.key]` (actor UUIDs).
- Cleanup directives run before AND after each scene (idempotency): `cleanup: supabase.from('table').delete().eq(...)` — they execute Supabase JS with the server client from `scenetest/config.ts`.
- Setup directives pre-set state: `setup: supabase.from(...)...`.
- Navigate through the UI after the entry `openTo` — never `openTo` mid-scene (wipes router cache).
- New `data-testid`s: use `data-testid` for unique elements, bare `data-key` on list items inside a `data-testid` container. NO dynamic computed testids (`data-testid={`foo-${bar}`}`) — use parent + `data-key` instead. Register every new id in `scenetest/TEST_IDS.md`.

## Commands you will need

| Purpose            | Command                                      | Expected on success              |
| ------------------ | -------------------------------------------- | -------------------------------- |
| Start Supabase     | `supabase start`                             | services running                 |
| Reset DB + seeds   | `supabase db reset`                          | exit 0                           |
| Dev server         | `pnpm dev`                                   | serving on http://127.0.0.1:5173 |
| Run one scene file | `pnpm scene scenetest/scenes/social.spec.md` | all scenes pass                  |
| Run all scenes     | `pnpm scene`                                 | all pass                         |
| Typecheck          | `pnpm check`                                 | exit 0                           |
| Lint               | `pnpm lint`                                  | exit 0                           |

## Scope

**In scope** (the only files you should modify):

- `scenetest/scenes/social.spec.md`
- `scenetest/scenes/profile.spec.md`
- `scenetest/TEST_IDS.md` (register new ids)
- Component files ONLY to add missing `data-testid` / `data-key` attributes (no behavior changes). Likely candidates: friend list/request components under `src/components/` and `src/routes/_user/friends/`, profile form components under `src/components/profile/`.

**Out of scope** (do NOT touch):

- `e2e/` — being decommissioned; do not port code from it beyond reading the old specs for intent.
- Any mutation logic in `src/features/social/hooks.ts` — a rewrite is planned separately (plan 002); these scenes must pass against CURRENT behavior.
- `scenetest/config.ts` actors/macros — unless a scene is impossible without a new macro; then STOP and report instead.

## Git workflow

- Branch: `advisor/001-social-profile-scene-specs`, based on `main`.
- No migrations touched → fast track (would merge to `main` per CLAUDE.md decision rule).
- Commit style: short imperative subject, e.g. `Implement stubbed social scene specs` (matches repo log).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the old e2e specs for intent

Read `e2e/mutations/social.spec.ts` and `e2e/mutations/profile.spec.ts` (they are skipped but document the intended flows and selectors). Also read the seed files (`supabase/seed-*.sql`) and note the seeded friend/chat state between `learner`, `friend`, `learner2`, `learner3`.

**Verify**: you can state, for each of the 9 stub scenes, which actor pair it uses and what DB rows it will create/mutate.

### Step 2: Implement the social scenes one at a time

For each of the 5 scenes in `social.spec.md`, replace the stub comment with DSL steps following the stub's own outline. Add a `cleanup:` directive per scene deleting the affected `friend_request_action` rows for the actor pair, e.g.:

```markdown
cleanup: supabase.from('friend_request_action').delete().eq('uid_less', ['[learner.key]','[friend.key]'].sort()[0]).eq('uid_more', ['[learner.key]','[friend.key]'].sort()[1])
```

(Adjust to the actual template-variable and JS-expression capabilities you observe in existing scenes — e.g. `scenetest/scenes/decks.spec.md` and `requests.spec.md` are the exemplars for cleanup style. If sorting inside a cleanup expression isn't expressible, use two `.or()` filters or two cleanup lines.)

Scenes 2 (`friend accepts...`) may need a `setup:` directive inserting a pending `invite` row so the accept flow starts from a known state — or rely on seed data if it provides one.

Multi-actor: scene 2 uses the `friend` actor; if verifying both sides of an action in one scene, use two actor blocks in the same scene (see `scenetest/scenes/chat.spec.md` or reference https://scenetest.msnook.xyz/reference/concurrent-and-classic.md for multi-actor syntax).

While implementing, add missing `data-testid`s to components as needed (convention above), registering each in `scenetest/TEST_IDS.md`.

**Verify** after EACH scene: `pnpm scene scenetest/scenes/social.spec.md` → implemented scenes pass.

### Step 3: Implement the profile scenes

Same procedure for the 4 stubs in `profile.spec.md`. Profile edits mutate `user_profile` — cleanup should restore the original seeded values (read them from the seed files, or use a `setup:` to set a known value first and edit from there).

**Verify**: `pnpm scene scenetest/scenes/profile.spec.md` → all pass.

### Step 4: Full suite + hygiene

**Verify**:

- `pnpm scene` → no regressions in other scene files
- `pnpm check` → exit 0
- `pnpm lint` → exit 0
- `grep -c "STUB" scenetest/scenes/social.spec.md scenetest/scenes/profile.spec.md` → `0` for both files

## Test plan

This plan IS the test plan. Coverage to exist when done:

- social: send request + cancel; accept + unfriend; decline; send recommendation into chat; send phrase request to a friend — each asserting the expected toast (`toast-success` / `toast-neutral`) and the resulting list state on `/friends`.
- profile: the 4 flows outlined in the profile stubs (read the stub comments).
- Pattern exemplar: `scenetest/scenes/decks.spec.md` (cleanup + mutation + toast assertion shape).

## Done criteria

- [ ] `grep -rn "STUB" scenetest/scenes/social.spec.md scenetest/scenes/profile.spec.md` returns no matches
- [ ] `pnpm scene scenetest/scenes/social.spec.md` → all scenes pass
- [ ] `pnpm scene scenetest/scenes/profile.spec.md` → all scenes pass
- [ ] `pnpm scene` → full suite passes (no regressions)
- [ ] `pnpm check` and `pnpm lint` exit 0
- [ ] Every new `data-testid` is registered in `scenetest/TEST_IDS.md`
- [ ] No component behavior changed (`git diff src/` shows only added `data-testid`/`data-key` attributes)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The stub comments no longer exist in the spec files (someone implemented them already).
- A flow described in a stub does not exist in the UI (e.g. there is no way to cancel a sent friend request from the interface) — that is a product gap, not a test bug; report which flow.
- The mutual-invite behavior surfaces: if `learner` invites `friend` while `friend` has a pending invite to `learner`, the DB trigger silently converts the invite to an accept and the UI shows a "Friend request sent 👍" toast even though they became friends. If a scene trips over this, pin the scene to the CURRENT observed behavior with a comment `<!-- known quirk, fixed by plan 002 -->` — do not fix the app code.
- Implementing a scene requires a new macro in `scenetest/config.ts`.
- A scene fails intermittently 3+ times with the same steps (flake — report, don't add sleeps).

## Maintenance notes

- Plan 002 rewrites the friend-request mutation path. These scenes are its safety net; after 002 lands, the mutual-invite quirk comment (if any) should be removed and the scene re-asserted against the corrected toast.
- Reviewer should scrutinize: cleanup idempotency (run each scene twice back-to-back: `pnpm scene <file>` twice must pass both times).
