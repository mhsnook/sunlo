# Project: Bidirectional Cards

## Overview

Implement Anki-style bidirectional learning where each phrase generates two independently-scheduled cards: forward (phrase → translation) and reverse (translation → phrase). These are distinct recall skills that strengthen at different rates.

## Problem Statement

Currently, our review system shows cards in a single direction. But learning to recognize "casa" and produce "house" is a different skill than seeing "house" and producing "casa". Users who can easily read a language often struggle to produce it, and vice versa.

## Proposed Solution

### Data Model Changes

Add `direction` enum to `user_card`:

```sql
-- Add direction enum type
create type public.card_direction as enum('forward', 'reverse');

-- Add direction column to user_card
alter table public.user_card
add column direction public.card_direction not null default 'forward';

-- Update unique constraint to allow two cards per phrase (one per direction)
-- Current: unique(uid, phrase_id)
-- New: unique(uid, phrase_id, direction)
```

Each direction gets its own FSRS scheduling state (stability, difficulty, due date, etc.) since they're learned independently.

### Card Creation Logic

When a user adds a phrase to their deck:

1. If `phrase.only_reverse = true`: Create only a reverse card
2. Otherwise: Create both forward and reverse cards

This integrates cleanly with the `only_reverse` feature we just implemented.

### Review Session Logic

**Bury Sibling Rule**: When a card is reviewed, its sibling (same phrase, opposite direction) should be excluded from the current session. This prevents the "too easy" problem where you just saw the answer.

Implementation approach:

- When building the review queue, if a phrase_id appears twice (forward + reverse), only include one
- After reviewing a card, mark its sibling as "buried" for the session
- Buried cards become available again in the next session

### UI Changes

1. **Review interface**: Show direction indicator (small "F" or "R" badge, or arrow icon)
2. **Card list/search**: Show both cards for a phrase, or group them visually
3. **Stats**: Could show forward vs reverse performance comparison

### Migration Strategy

For existing cards:

- Option A: Leave existing cards as forward-only (users can manually add reverse)
- Option B: Auto-generate reverse cards for all existing cards (doubles card count)
- Option C: Add a one-time prompt asking users if they want to enable bidirectional for existing cards

Recommendation: Option A is safest. New cards get both directions automatically; existing cards stay as-is.

## Complexity Assessment

**Complexity: 3** - Touches data model, card creation, review logic, and UI
**Estimated Difficulty: 3** - The bury-sibling logic and migration need careful handling

## Open Questions

1. Should the bury-sibling logic be time-based (bury for 24 hours) or session-based (bury until next review session)?
2. How should we display sibling cards in the card list - grouped or separate entries?
3. For the review queue builder, should we prefer showing the card that's more "due" or alternate directions?

## Dependencies

- Requires `only_reverse` feature (COMPLETE)
- Requires client-side FSRS (COMPLETE)

## Files Likely to Change

- `supabase/migrations/` - new migration for direction column
- `src/lib/schemas.ts` - update CardMetaSchema
- `src/hooks/use-reviews.ts` - bury-sibling logic in queue building
- `src/routes/_user/learn/$lang.review.go.tsx` - direction indicator in UI
- `src/components/cards/` - show direction in card displays
- Any RPC or code that creates user_cards - create both directions

## Not Included (Intentionally Simple)

- Per-deck enable/disable of bidirectional mode
- Per-card toggle to disable one direction after creation
- Different FSRS parameters for forward vs reverse
- User preference for "forward-first" vs "reverse-first" learning order

These can be added later if users request them.
