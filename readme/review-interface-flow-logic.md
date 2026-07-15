# Review Interface Logic / Flow

1. Phase 1. User sees all cards in no particular order, but with a clear indication "card 1 of 20" "2 of 20" etc.
2. Phase 2. User sees all cards that were skipped the first time, and none of the cards have a review today/this session. If the user skips a card again in this phase, it's out for the day.
3. Phase 3. User sees all cards whose first review was a (1 - Again) and reviews them all in a loop; cards are removed from the loop if they get skipped again, or marked 2, 3, or 4. These are "second reviews". As of #724 the again-round is **append-only**: every tap writes a new row, so how many times a card was retried is preserved rather than overwritten. The card's place in the loop is driven by its _latest_ review (newest `created_at` wins per card).

Some considerations:

- When a card is skipped, its answer gets hidden. When a card is answered and then the user navigates back to it (only possible in phase 1's header), the answer is shown and the same review can be UPDATED — a correction, not a new fact.
- Nav at the top: In phase 1 the nav says "card 1 of 20" with little buttons for next and prev. But in phase 2 and 3 it switches to "4 cards left" with the same buttons.
- Each review row records the session `stage` it happened in (mirroring `user_deck_review_state.stage`): **1** = first pass, **2** = go-back pass, **3** = again-round. FSRS reads only the scoring stages (`stage IN (1, 2)`); stage-3 rows are tracking-only and carry NULL FSRS columns. This replaced the old `day_first_review` flag (#724), which conflated "where in the session" with "does FSRS read it".

## SOLVED: Phase 3 Infinite Loop Bug

**Problem:** During phase 3 we were seeing the same cards over and over and over again.

**Root Cause (Fixed 2026-01-17):** `useReviewsToday` didn't order reviews by `created_at`, so when multiple reviews existed for the same card, `buildReviewsMap` could pick the OLDER review (score=1) instead of the NEWER one (score=3), and the card never left the again-loop. Fixed by adding `.orderBy(({ review }) => review.created_at, 'asc')` so the newest review wins per card.

> Historical note: an earlier fix also made phase 3 UPDATE a single row in place (rather than insert) to sidestep the ordering bug. #724 reverted that — the again-round is append-only again — but the ASC ordering above keeps "latest review wins" correct regardless of how many rows a card accumulates.
