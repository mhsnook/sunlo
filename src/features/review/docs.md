# Review scheduling

What the review flow guarantees to the code that consumes it. Implementation lives in `src/features/review/`; this page carries the rules that reach outside that folder — the routes layer builds today's manifest and has to know them.

## The manifest

A review day has a **manifest**: the ordered list of cards to show. An entry is `${phraseId}:${direction}`, so one phrase can contribute two entries — `forward` and `reverse` are separate cards with separate FSRS state.

`src/routes/_user/learn/$lang.review.index.tsx` builds it. It collects the candidate set, filters that set through bury-siblings, and writes the result.

## Review phases

Not every recorded review feeds scheduling.

- **Phase 1** — the scoring review. It carries FSRS columns and advances the card's chain. `isScoringReview()` identifies these.
- **Phase 3** — a re-review inside the same session, after the user has already scored the card. Tracking only: it carries null FSRS columns and stays out of the scheduling chain.

A card's next interval is computed from its phase-1 chain, so a phase-3 row is never the predecessor of anything. `findChainPredecessor()` skips them.

## Bury-siblings

When a phrase has both a forward and a reverse card eligible on the same day, one of them is left out of today's manifest. Answering "house → casa" and then being asked "casa → house" a few cards later isn't a meaningful retrieval, and it spends attention twice on one phrase.

The buried sibling isn't recorded as deferred anywhere. It's left out of today's manifest and falls back into normal scheduling tomorrow. The `user_card` row is still inserted for a brand-new card, so the sibling can come up in a later session.

The decision runs in order:

1. **Both siblings unreviewed** — keep both. A first encounter pairs recognition then recall in one session to anchor the phrase; burying starts from the second session.
2. **The reverse sibling's two most recent phase-1 reviews both scored 1 (Again)** — bury the reverse, show the forward. A third failed recall attempt isn't useful, so the user re-anchors recognition first.
3. **Otherwise** — bury whichever sibling will be less overdue tomorrow, meaning the one whose retrievability at t+1 day is higher. The card that decays faster has the greater cost of deferring.
4. **Retrievability can't be compared** (one sibling reviewed, one not) — bury the reverse, show the forward. Recognition before recall is the safer default.

Rule 2 is why the route passes a language-scoped review list into the filter: the decision reads the reverse card's recent phase-1 history, which the candidate set alone doesn't carry.

`decideBuryDirection()` implements the ordering and `partitionBuriedSiblings()` applies it to a candidate set. Both are exported from `@/features/review`.
