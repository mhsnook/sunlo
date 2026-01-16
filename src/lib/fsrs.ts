/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Implementation
 *
 * This is a client-side TypeScript port of the PLv8 FSRS functions.
 * The algorithm calculates optimal review intervals based on:
 * - Difficulty: How hard the card is (1-10)
 * - Stability: How well the memory is retained (days)
 * - Retrievability: Probability of recall at review time (0-1)
 * - Score: User's self-assessment (1=Again, 2=Hard, 3=Good, 4=Easy)
 */

import { CardReviewType } from './schemas'
import { dateDiff } from './utils'

// FSRS v5 weights (pre-trained parameters)
const W = {
	// Initial stability by score [Again, Hard, Good, Easy]
	S_0: [0.40255, 1.18385, 3.173, 15.69105],
	// Difficulty parameters
	W_4: 7.1949,
	W_5: 0.5345,
	W_6: 1.4604,
	W_7: 0.0046,
	// Stability success parameters
	W_8: 1.54575,
	W_9: 0.1192,
	W_10: 1.01925,
	// Stability fail parameters
	W_11: 1.9395,
	W_12: 0.11,
	W_13: 0.29605,
	W_14: 2.2698,
	// Hard/Easy bonuses
	W_15: 0.2315,
	W_16: 2.9898,
}

// Retrievability formula constants
const RETRIEVABILITY_F = 19.0 / 81.0
const RETRIEVABILITY_C = -0.5

export type Score = 1 | 2 | 3 | 4

export interface FSRSInput {
	score: Score
	previousReview?: CardReviewType
	currentTime?: Date
	desiredRetention?: number
}

export interface FSRSOutput {
	difficulty: number
	stability: number
	retrievability: number | null
	interval: number
	scheduledFor: Date
}

/**
 * Clamp difficulty to valid range [1, 10]
 */
function clampDifficulty(d: number): number {
	return Math.min(Math.max(d, 1.0), 10.0)
}

/**
 * Calculate initial difficulty for a new card
 */
function initialDifficulty(score: Score): number {
	return clampDifficulty(W.W_4 - Math.exp(W.W_5 * (score - 1.0)) + 1.0)
}

/**
 * Calculate difficulty delta based on score
 */
function difficultyDelta(score: Score): number {
	return -W.W_6 * (score - 3.0)
}

/**
 * Calculate difficulty prime (intermediate step)
 */
function difficultyPrime(difficulty: number, score: Score): number {
	return difficulty + difficultyDelta(score) * ((10.0 - difficulty) / 9.0)
}

/**
 * Calculate new difficulty after a review
 */
function nextDifficulty(difficulty: number, score: Score): number {
	return clampDifficulty(
		W.W_7 * initialDifficulty(4) +
			(1.0 - W.W_7) * difficultyPrime(difficulty, score)
	)
}

/**
 * Calculate initial stability for a new card
 */
function initialStability(score: Score): number {
	return W.S_0[score - 1]
}

/**
 * Calculate retrievability (probability of recall) given time elapsed
 */
export function retrievability(timeInDays: number, stability: number): number {
	return Math.pow(
		1.0 + RETRIEVABILITY_F * (timeInDays / stability),
		RETRIEVABILITY_C
	)
}

/**
 * Calculate new stability after a failed review (score = 1)
 */
function stabilityAfterFail(
	difficulty: number,
	stability: number,
	retrievabilityAtReview: number
): number {
	const d_f = Math.pow(difficulty, -W.W_12)
	const s_f = Math.pow(stability + 1.0, W.W_13) - 1.0
	const r_f = Math.exp(W.W_14 * (1.0 - retrievabilityAtReview))
	const c_f = W.W_11
	const newStability = d_f * s_f * r_f * c_f
	// Stability can't increase after failure
	return Math.min(newStability, stability)
}

/**
 * Calculate new stability after a successful review (score >= 2)
 */
function stabilityAfterSuccess(
	difficulty: number,
	stability: number,
	retrievabilityAtReview: number,
	score: Score
): number {
	const t_d = 11.0 - difficulty
	const t_s = Math.pow(stability, -W.W_9)
	const t_r = Math.exp(W.W_10 * (1.0 - retrievabilityAtReview)) - 1.0
	const h = score === 2 ? W.W_15 : 1.0 // Hard penalty
	const b = score === 4 ? W.W_16 : 1.0 // Easy bonus
	const c = Math.exp(W.W_8)
	const alpha = 1.0 + t_d * t_s * t_r * h * b * c
	return stability * alpha
}

/**
 * Calculate new stability after a review
 */
function nextStability(
	difficulty: number,
	stability: number,
	retrievabilityAtReview: number,
	score: Score
): number {
	if (score === 1) {
		return stabilityAfterFail(difficulty, stability, retrievabilityAtReview)
	}
	return stabilityAfterSuccess(
		difficulty,
		stability,
		retrievabilityAtReview,
		score
	)
}

/**
 * Calculate the interval (in days) to achieve desired retrievability
 */
function calculateInterval(
	desiredRetrievability: number,
	stability: number
): number {
	return (
		(stability / RETRIEVABILITY_F) *
		(Math.pow(desiredRetrievability, 1.0 / RETRIEVABILITY_C) - 1.0)
	)
}

/**
 * Main FSRS calculation function
 *
 * Given a score and optional previous review data, calculates:
 * - New difficulty and stability values
 * - Retrievability at time of review
 * - Optimal interval until next review
 * - Scheduled date for next review
 */
export function calculateFSRS(input: FSRSInput): FSRSOutput {
	const {
		score,
		previousReview,
		currentTime = new Date(),
		desiredRetention = 0.9,
	} = input

	let difficulty: number
	let stability: number
	let currentRetrievability: number | null = null

	if (
		!previousReview ||
		previousReview.difficulty === null ||
		previousReview.stability === null
	) {
		// First review of this card (or previous review has no FSRS data)
		difficulty = initialDifficulty(score)
		stability = initialStability(score)
	} else {
		// Subsequent review with valid FSRS data
		const timeSinceLastReview = dateDiff(previousReview.created_at, currentTime)

		// Calculate how well we expected to remember this
		currentRetrievability = retrievability(
			timeSinceLastReview,
			previousReview.stability
		)

		// Update difficulty and stability based on performance
		difficulty = nextDifficulty(previousReview.difficulty, score)
		stability = nextStability(
			previousReview.difficulty,
			previousReview.stability,
			currentRetrievability,
			score
		)
	}

	// Calculate optimal interval (in days)
	const interval = Math.max(calculateInterval(desiredRetention, stability), 1)

	// Calculate scheduled date (uses rounded interval)
	const scheduledFor = new Date(currentTime)
	scheduledFor.setDate(scheduledFor.getDate() + Math.round(interval))

	return {
		difficulty,
		stability,
		retrievability: currentRetrievability,
		interval,
		scheduledFor,
	}
}

/**
 * Validate FSRS values are within acceptable bounds
 * Use this on the server to validate client-calculated values
 */
export function validateFSRSValues(values: {
	difficulty: number
	stability: number
	retrievability: number | null
}): { valid: boolean; errors: string[] } {
	const errors: string[] = []

	if (values.difficulty < 1 || values.difficulty > 10) {
		errors.push(`Difficulty ${values.difficulty} out of range [1, 10]`)
	}

	if (values.stability < 0) {
		errors.push(`Stability ${values.stability} cannot be negative`)
	}

	if (values.stability > 36500) {
		// 100 years seems like a reasonable max
		errors.push(`Stability ${values.stability} exceeds maximum`)
	}

	if (
		values.retrievability !== null &&
		(values.retrievability < 0 || values.retrievability > 1)
	) {
		errors.push(`Retrievability ${values.retrievability} out of range [0, 1]`)
	}

	return {
		valid: errors.length === 0,
		errors,
	}
}

/**
 * Calculate the intervals for all four possible scores
 * Useful for showing users what each button will do
 */
export function intervals(
	previousReview?: CardReviewType,
	currentTime: Date = new Date(),
	desiredRetention: number = 0.9
): number[] {
	const scores: Score[] = [1, 2, 3, 4]
	return scores.map((score) => {
		const result = calculateFSRS({
			score,
			previousReview,
			currentTime,
			desiredRetention,
		})
		return result.interval
	})
}
