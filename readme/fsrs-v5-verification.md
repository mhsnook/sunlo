# FSRS Verification and Card Selection Logic

## Overview

This document explains how the FSRS v5.0 (Free Spaced Repetition Scheduler version 5.0) algorithm works in Sunlo, how cards are selected for review, and how to verify correctness.

## The FSRS Algorithm

### Core Concepts

1. **Difficulty (D)**: How hard the card is, range [1, 10]
2. **Stability (S)**: How long the memory lasts in days - if stability is 10, you have ~90% chance of remembering after 10 days
3. **Retrievability (R)**: Probability of recall at review time, range [0, 1]
4. **Score**: User's self-assessment (1=Again, 2=Hard, 3=Good, 4=Easy)

### The Retrievability Formula

```
R(t) = (1 + f * (t / S))^c

where:
  t = time since last review (days)
  S = stability (days)
  f = 19/81 ≈ 0.2346
  c = -0.5
```

This formula means:

- At t=0 (just reviewed): R = 1.0 (100% recall)
- At t=S (stability days later): R ≈ 0.9 (90% recall)
- As t increases beyond S: R continues to decay

### Key Insight: Stability ≈ Target Interval

When desired retention is 0.9 (90%), the calculated interval equals approximately the stability value. This is because:

```
interval = (S / f) * (R_target^(1/c) - 1)
         = (S / 0.2346) * (0.9^(-2) - 1)
         = (S / 0.2346) * (1.2346 - 1)
         = (S / 0.2346) * 0.2346
         = S
```

So if a card has stability of 10 days, the next review will be scheduled ~10 days later.

## Card Selection Logic

### When Are Cards Due for Review?

Cards are selected when `retrievability_now <= 0.9`. This is calculated in real-time:

**In SQL** (`user_card_plus` view):

```sql
power(
	1.0 + (19.0 / 81.0) * (
		extract(
			epoch
			from
				(current_timestamp - review.created_at)
		) / 3600.0 / 24.0
	) / nullif(review.stability, 0),
	-0.5
) as retrievability_now
```

**In TypeScript** (`src/lib/fsrs.ts`):

```typescript
export function retrievability(timeInDays: number, stability: number): number {
	return Math.pow(
		1.0 + RETRIEVABILITY_F * (timeInDays / stability),
		RETRIEVABILITY_C
	)
}
```

### Review Session Priority

When building the daily review manifest:

1. **Scheduled cards** (`today_active`): Cards where `retrievability_now <= 0.9 AND status = 'active'`
2. **Unreviewed deck cards**: Active cards never reviewed
3. **Algorithm recommendations**: Popular, easiest, newest phrases
4. **Library fallback**: Random phrases if needed to meet goal

### The 0.9 Threshold

Why 0.9? This is the `desiredRetention` parameter - we want to review cards before recall probability drops below 90%. This gives a buffer before forgetting occurs.

## Verification Strategies

### 1. Unit Tests for FSRS Calculations

Create tests that verify known inputs produce expected outputs:

```typescript
// test/fsrs.test.ts
import { calculateFSRS, retrievability, intervals } from '@/lib/fsrs'

describe('FSRS calculations', () => {
	describe('retrievability', () => {
		it('returns 1.0 at time 0', () => {
			expect(retrievability(0, 10)).toBeCloseTo(1.0)
		})

		it('returns ~0.9 when time equals stability', () => {
			expect(retrievability(10, 10)).toBeCloseTo(0.9, 1)
		})

		it('decays over time', () => {
			const r1 = retrievability(5, 10)
			const r2 = retrievability(10, 10)
			const r3 = retrievability(20, 10)
			expect(r1).toBeGreaterThan(r2)
			expect(r2).toBeGreaterThan(r3)
		})
	})

	describe('initial review (no previous)', () => {
		it('calculates correct initial stability for each score', () => {
			// FSRS v5 initial stabilities: [0.40255, 1.18385, 3.173, 15.69105]
			const results = [1, 2, 3, 4].map((score) =>
				calculateFSRS({ score: score as 1 | 2 | 3 | 4 })
			)

			expect(results[0].stability).toBeCloseTo(0.4, 1) // Again
			expect(results[1].stability).toBeCloseTo(1.18, 1) // Hard
			expect(results[2].stability).toBeCloseTo(3.17, 1) // Good
			expect(results[3].stability).toBeCloseTo(15.69, 1) // Easy
		})
	})

	describe('subsequent reviews', () => {
		it('increases stability on successful review', () => {
			const previousReview = {
				id: 'test',
				created_at: new Date(
					Date.now() - 3 * 24 * 60 * 60 * 1000
				).toISOString(),
				difficulty: 5,
				stability: 3,
				// ... other required fields
			}

			const result = calculateFSRS({
				score: 3,
				previousReview: previousReview as CardReviewType,
			})

			expect(result.stability).toBeGreaterThan(3)
		})

		it('decreases or caps stability on failed review', () => {
			const previousReview = {
				created_at: new Date(
					Date.now() - 3 * 24 * 60 * 60 * 1000
				).toISOString(),
				difficulty: 5,
				stability: 10,
				// ... other required fields
			}

			const result = calculateFSRS({
				score: 1,
				previousReview: previousReview as CardReviewType,
			})

			expect(result.stability).toBeLessThanOrEqual(10)
		})
	})
})
```

### 2. SQL vs TypeScript Parity Check

The retrievability calculation exists in two places. Verify they match:

```typescript
// In a test or debug script
import { retrievability } from '@/lib/fsrs'

// Compare TypeScript calculation with what the DB returns
const card = await supabase
	.from('user_card_plus')
	.select('stability, last_reviewed_at, retrievability_now')
	.single()

const daysSinceReview =
	(Date.now() - new Date(card.last_reviewed_at).getTime()) /
	(1000 * 60 * 60 * 24)

const tsRetrievability = retrievability(daysSinceReview, card.stability)
const sqlRetrievability = card.retrievability_now

console.log('TypeScript:', tsRetrievability)
console.log('SQL:', sqlRetrievability)
console.log('Match:', Math.abs(tsRetrievability - sqlRetrievability) < 0.001)
```

### 3. Manual Verification Table

For a card with stability S, verify these retrievability checkpoints:

| Days Since Review | Expected R (approx) |
| ----------------- | ------------------- |
| 0                 | 1.00                |
| S \* 0.25         | 0.97                |
| S \* 0.5          | 0.94                |
| S \* 0.75         | 0.92                |
| S \* 1.0          | 0.90                |
| S \* 1.5          | 0.86                |
| S \* 2.0          | 0.82                |

### 4. Integration Test: Card Selection

```typescript
// e2e/card-selection.spec.ts
test('cards with retrievability <= 0.9 appear in today_active', async () => {
	// Create a card with known stability
	// Wait or mock time so retrievability drops below 0.9
	// Verify it appears in deckPids.today_active
})

test('cards with retrievability > 0.9 do NOT appear in today_active', async () => {
	// Create a card and review it
	// Immediately check - should NOT be in today_active
	// Because retrievability is still ~1.0
})
```

### 5. Debug Panel

The `PhraseExtraInfo` component shows FSRS data for debugging:

- Difficulty, Stability
- Days since last review
- Expected retrievability now
- Interval spread for each score

Use this to spot-check individual cards.

## Known Edge Cases

### 1. Null Stability/Difficulty

Old reviews before FSRS was implemented may have null values. The code handles this by treating them as first reviews:

```typescript
if (
	!previousReview ||
	previousReview.difficulty === null ||
	previousReview.stability === null
) {
	// Treat as first review
	difficulty = initialDifficulty(score)
	stability = initialStability(score)
}
```

### 2. Division by Zero

If stability is 0 (shouldn't happen but defensive), SQL uses `nullif(stability, 0)` to return NULL instead of error.

### 3. Date String vs Date Object

Database dates come as strings. The `dateDiff` function handles both:

```typescript
const prev: Date = typeof prev_at === 'string' ? new Date(prev_at) : prev_at
```

## FSRS v5 Parameters

The algorithm uses pre-trained weights from FSRS v5:

```typescript
const W = {
	S_0: [0.40255, 1.18385, 3.173, 15.69105], // Initial stability by score
	W_4: 7.1949, // Difficulty parameters
	W_5: 0.5345,
	W_6: 1.4604,
	W_7: 0.0046,
	W_8: 1.54575, // Stability success parameters
	W_9: 0.1192,
	W_10: 1.01925,
	W_11: 1.9395, // Stability fail parameters
	W_12: 0.11,
	W_13: 0.29605,
	W_14: 2.2698,
	W_15: 0.2315, // Hard/Easy bonuses
	W_16: 2.9898,
}
```

These are from the open-spaced-repetition project and are trained on millions of reviews.

## References

- [FSRS Algorithm Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)
- [FSRS v5 Paper](https://github.com/open-spaced-repetition/fsrs4anki/wiki/Spaced-Repetition-Algorithm:-A-Three%E2%80%90Day-Journey-from-�ейл-to-Anki)
- Original PLv8 implementation: `supabase/migrations/` (now dropped)
- TypeScript implementation: `src/lib/fsrs.ts`
