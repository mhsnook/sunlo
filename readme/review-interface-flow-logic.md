# Review Interface Logic / Flow

1. Phase 1. User sees all cards in no particular order, but with a clear indication "card 1 of 20" "2 of 20" etc.
2. Phase 2. User sees all cards that were skipped the first time, and none of the cards have a review today/this session. If the user skips a card again in this phase, it's out for the day.
3. Phase 3. User ses all cards whose first review was a (1 - Again) and reviews them all in a loop; cards are removed from the loop of they get skipped again, or marked 2, 3, or 4. These are "second reviews" and during phase 3, if there is more than one review there should still only be one record for this second review (and also the one from the earlier phase), making 2 reviews total for that card during that day_session, with the first review having score=1 and the second review hopefully having some other score (although it is possible to have a second review with score=1 and then skip the card again and so have two reviews on that day both with score=1).

Some considerations:

- When a card is skipped, its answer gets hidden. When a card is answered and then the user navigates back to it, the answer is shown and the same review can be UPDATED.
- Nav at the top: In phase 1 the nav says "card 1 of 20" with little buttons for next and prev. But in phase 2 and 3 it switches to "4 cards left" with the same buttons.
- In the first phase the reviews get a value `day_first_review=TRUE`. In the second phase we're just seeing skipped cards, so the value is still `TRUE`. In the third phase we are doing second results, which are meant to be left out of many of our mathematical equations, but can still be stored for posterity. They are not meant to recalculate the FSRS numbers but merely to record that the user has gone ahead and continued working on the phrase until success, so we set `day_first_review=FALSE`

## SOLVED: Phase 3 Infinite Loop Bug

**Problem:** During phase 3 we were seeing the same cards over and over and over again.

**Root Causes (Fixed 2026-01-17):**

1. **reviewsMap ordering issue** - `useReviewsToday` didn't order reviews by `created_at`, so when multiple reviews existed for the same card (which happens in phase 3), `mapArray` could pick the OLDER review (score=1) instead of the NEWER one (score=3). Fixed by adding `.orderBy(({ review }) => review.created_at, 'asc')`.

2. **Phase 3 always INSERTed instead of UPDATEing** - The mutation was creating NEW review records every time in phase 3 instead of updating the existing phase-3 review. This created multiple reviews per card, causing the ordering issue above. Fixed by checking if `prevDataToday?.day_first_review === false` and updating instead of inserting.

3. **`day_first_review` wasn't being set correctly** - Phase 3 reviews should have `day_first_review=FALSE` to distinguish them from phase 1-2 reviews, but the code wasn't setting this. Fixed by passing `day_first_review: false` to `postReview` for phase 3 inserts.
