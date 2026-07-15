# Plan 007: Extract session-setup logic from $lang.review.index.tsx into feature hooks

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1c4b60ef..HEAD -- "src/routes/_user/learn/\$lang.review.index.tsx" src/features/review/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but coordinate: do not run concurrently with any other work touching review)
- **Category**: tech-debt

- **Planned at**: commit `1c4b60ef`, 2026-07-08

## Why this matters

`src/routes/_user/learn/$lang.review.index.tsx` is 639 lines mixing three responsibilities: (1) the candidate-selection pipeline that decides which cards enter today's review session (a numbered 6-step waterfall: friend recs → algo recs → deck unreviewed → library fill → collate → dedupe), (2) the session-creation mutation, and (3) page rendering. The selection pipeline is the app's most consequential pure-ish logic outside FSRS itself — it decides what users study — yet it is untestable in isolation because it lives inline in a route component, interleaved with hooks and JSX. Extracting it into the review feature module makes it unit-testable (the feature already has strong test culture: `bury-siblings.test.ts`, `manifest.test.ts`, `store.test.ts`, `fsrs.parity.test.ts`) and shrinks the route to orchestration + display.

## Current state

- `src/routes/_user/learn/$lang.review.index.tsx` — structure at planning time:
  - `:5` — imports `useMutation` from react-query
  - `:62` — `function phraseBreakdown(...)` (helper)
  - `:74` — `Route = createFileRoute('/_user/learn/$lang/review/')`
  - `:84` — `ReviewPageSetup()` (wrapper)
  - `:100-309` — `ReviewPageContent()`: gathers `useDeckMeta(lang)`, `useCompositePids(lang)`, `useDeckPids(lang)`, `useReviewsTodayStats`, then runs the numbered candidate waterfall inline. Excerpt (lines 118-190, abridged):

    ```ts
    // 2.
    // haven't built this feature yet, is why it's blank array
    // const friendRecsFromDB: pids = [] // useCardsRecommendedByFriends(lang)
    const friendRecsFiltered = arrayDifference([...], [...])
    const friendRecsSelected = friendRecsFiltered.slice(0, meta?.daily_review_goal ?? 0)
    const countNeeded2 = min0((meta?.daily_review_goal ?? 0) - friendRecsSelected.length)
    // 3. algo recs set by user
    const algoRecsFiltered = { popular: ..., easiest: ..., newest: ... }
    ...
    // 4. deck cards
    const cardsUnreviewedActiveSelected = arrayDifference(...).slice(0, countNeeded3)
    ...
    // 5. pick cards randomly from the library, if needed
    const libraryPhrasesSelected = arrayDifference(...).toSorted(...).slice(0, countNeeded4)
    // 6. now let's just collate the cards we need to create on user_card table
    const freshCards = arrayUnion([...])
    const cardsToCreate = arrayDifference(freshCards, [deckPids?.all ?? []])
    const allPhraseIdsForToday = arrayUnion([freshCards, deckPids?.today_active ?? []])
    ```

  - `:198-219+` — fetches `useDeckCards(lang)`, a lang-scoped `cardReviewsCollection` live query for bury-siblings, builds Sets, defines `type ReviewCandidate = BurySiblingCandidate & { bucket: 'due' | 'fresh' }` and (past line 219) applies bury-siblings once to a unified candidate list — display counts AND the persisted manifest both derive from the same `kept` list (a load-bearing invariant, per the comment at ~:215-218).
  - `:310+` — `useMutation` creating the session (inserts `user_card` rows for `cardsToCreate`, persists the manifest/`user_deck_review_state`); component state (`sessionJustCreatedRef`, `algoRecsSelected`), intro dialog via `useIntro('review')`, and rendering follow.

  READ THE WHOLE FILE FIRST. The excerpts above locate the seams; the plan does not reproduce all 639 lines.

- The review feature module (`src/features/review/`) already contains: `bury-siblings.ts` (+test), `manifest.ts` (+test), `review-utils.ts`, `hooks.ts` (616 lines — do NOT grow it; new files instead), `store.ts`, `fsrs.ts`, barrel `index.ts`.
- Existing scene coverage that pins current behavior: `scenetest/scenes/reviews.spec.ts`, `review-stats-consistency.spec.ts`, `bidirectional-review.spec.md`, `review-answer-mode.spec.md`, `set-membership-invariants.spec.ts`.
- Repo conventions: concise functional TS, tabs, `Array<T>` over `T[]`, feature logic in `src/features/<domain>/`, route files keep orchestration only. Vitest test style: model after `src/features/review/bury-siblings.test.ts`.

## Commands you will need

| Purpose       | Command                                                                                                                                            | Expected on success |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck     | `pnpm check`                                                                                                                                       | exit 0              |
| Lint          | `pnpm lint`                                                                                                                                        | exit 0              |
| Unit tests    | `pnpm test:unit`                                                                                                                                   | all pass, incl. new |
| Review scenes | `pnpm scene scenetest/scenes/reviews.spec.ts scenetest/scenes/review-stats-consistency.spec.ts scenetest/scenes/set-membership-invariants.spec.ts` | pass                |
| Full scenes   | `pnpm scene`                                                                                                                                       | pass                |

## Scope

**In scope**:

- `src/routes/_user/learn/$lang.review.index.tsx` (shrink)
- `src/features/review/session-setup.ts` (create — pure selection pipeline)
- `src/features/review/session-setup.test.ts` (create)
- `src/features/review/use-session-setup.ts` (create — the hook wiring live queries into the pure function, plus the extracted session-creation mutation hook; two exports, one file)
- `src/features/review/index.ts` (barrel exports)

**Out of scope** (do NOT touch):

- `src/features/review/hooks.ts`, `fsrs.ts`, `store.ts`, `bury-siblings.ts`, `manifest.ts` — consume, don't modify.
- `$lang.review.go.tsx` / the active-session flow.
- ANY behavior change. This is a pure extraction: same cards selected, same manifest persisted, same counts displayed. The commented-out friend-recs stub (`:118-124`) moves along verbatim — do not "clean it up" (it marks an unbuilt feature).
- The `useMutation` → collection-handler migration for the session-create mutation — review is a documented exception (CLAUDE.md); extract it as-is.

## Git workflow

- Branch: `advisor/007-split-review-setup`, based on `main`. Fast track.
- Two commits: `Extract review session-setup pipeline into features/review` then `Slim review index route to orchestration`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract the pure pipeline

Create `src/features/review/session-setup.ts` with a pure function, signature roughly:

```ts
export type SessionSetupInputs = {
	dailyGoal: number
	deckPids: DeckPidsType | undefined // the exact type useDeckPids returns
	recs: /* useCompositePids return */ | undefined
	algoRecsSelected: pids
	deckCards: /* useDeckCards rows */ | undefined
	reviewsForLang: Array<CardReviewType>
	statsToday: /* what the bury/candidate steps actually consume */
}

export function buildSessionCandidates(inputs: SessionSetupInputs): {
	freshCards: pids
	cardsToCreate: pids
	allPhraseIdsForToday: pids
	kept: Array<ReviewCandidate> // post bury-siblings
	counts: { /* whatever the render needs: due, fresh, buried, ... */ }
	algoRecsFiltered: { popular: pids; easiest: pids; newest: pids }
	algosEmpty: boolean
}
```

Move the waterfall (steps 2–6, the Set-building, the unified-candidate construction, and the bury-siblings application) verbatim — same variable names, same comments (including the numbered step comments and the `kept`-invariant comment). The exact input/output fields are discovered while extracting: everything the JSX or the mutation reads from the pipeline must be in the return type. Keep `phraseBreakdown` in the route if only the render uses it; move it if the pipeline uses it.

**Verify**: `pnpm check` → exit 0 (route now imports and calls `buildSessionCandidates`; behavior identical because the code moved, not changed).

### Step 2: Characterize with unit tests

Create `src/features/review/session-setup.test.ts` (model after `bury-siblings.test.ts`). Cases, minimum:

- goal met entirely by deck unreviewed cards → no library fill (`libraryPhrasesSelected` empty ⇒ `cardsToCreate` ⊆ algo selections)
- deck exhausted → library fill tops up to the goal, sorted-by-pid-desc determinism
- already-reviewed/inactive pids never appear in `freshCards`
- `cardsToCreate` excludes pids already in the deck (`deckPids.all`)
- `allPhraseIdsForToday` = fresh ∪ today_active, no duplicates
- empty everything → empty outputs, no throws (`dailyGoal: 0`, undefined deckPids)
- bury-siblings actually applied: construct a candidate pair the rules would bury and assert it's absent from `kept`

**Verify**: `pnpm test:unit` → all pass including the new file.

### Step 3: Extract the hooks

In `src/features/review/use-session-setup.ts`:

- `useSessionSetup(lang, algoRecsSelected)` — gathers the live queries currently in `ReviewPageContent` (`useDeckMeta`, `useCompositePids`, `useDeckPids`, `useDeckCards`, the lang-scoped reviews query, `useReviewsTodayStats`) and returns `buildSessionCandidates(...)` plus the raw bits the render still needs (`meta`, `stats`, loading flags).
- `useStartReviewSession(...)` — the `useMutation` block from `:310+` moved verbatim (including its onSuccess/onError and `sessionJustCreatedRef` interplay — if the ref is genuinely component-local, leave the ref in the component and pass a callback).

Export both (and the pure module) from the feature barrel `src/features/review/index.ts`. Update the route to consume them; `ReviewPageContent` should end up ~roughly the JSX + `useIntro` + local UI state (`algoRecsSelected`, refs).

**Verify**: `pnpm check` → exit 0; `wc -l "src/routes/_user/learn/\$lang.review.index.tsx"` → ≤ 350 (soft target; report the number).

### Step 4: Behavioral regression gate

**Verify**:

- `pnpm scene scenetest/scenes/reviews.spec.ts scenetest/scenes/review-stats-consistency.spec.ts scenetest/scenes/set-membership-invariants.spec.ts` → pass (these pin the counts-vs-manifest invariant)
- `pnpm scene` → full suite passes
- `pnpm lint` → exit 0

## Test plan

- New: `session-setup.test.ts` (cases in Step 2).
- Regression: the three review scene specs + full suite (Step 4). `review-stats-consistency.spec.ts` and `set-membership-invariants.spec.ts` exist precisely to catch the class of bug this refactor could introduce (displayed counts diverging from the persisted manifest) — treat any failure there as a hard stop.

## Done criteria

- [ ] `src/features/review/session-setup.ts` + tests exist; pipeline logic no longer inline in the route
- [ ] `pnpm test:unit` passes with ≥7 new session-setup cases
- [ ] All review scene specs pass; full `pnpm scene` passes
- [ ] `pnpm check`, `pnpm lint` exit 0
- [ ] Route file reduced (report before/after line counts)
- [ ] `git diff` shows moved code (same comments preserved), not rewritten logic
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The pipeline turns out to read component state beyond `algoRecsSelected` (hidden coupling the excerpts didn't show) and the pure-function signature would need >2 more mutable inputs — the seam is wrong; report what you found.
- `review-stats-consistency` or `set-membership-invariants` scenes fail after extraction — do not patch the pipeline to make them pass; the extraction changed behavior somewhere. Bisect by diffing intermediate values, or stop.
- You need to modify `bury-siblings.ts` or `hooks.ts` to complete the extraction.

## Maintenance notes

- The commented friend-recs stub (`useCardsRecommendedByFriends`) now lives in `session-setup.ts` — when that feature is built, it becomes one more input to `buildSessionCandidates` with a unit test, which is the payoff of this extraction.
- Reviewer focus: the `kept`-derives-both-counts-and-manifest invariant; confirm the mutation and the display consume the SAME return object, not recomputed variants.
- Deferred: further shrinking the render (intro dialog, preview grid) into co-located `-` components — only if the file is still unwieldy after this lands.
