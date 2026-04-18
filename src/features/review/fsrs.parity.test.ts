/**
 * Reference-vector parity tests against ts-fsrs (FSRS-5.0, v4.7.1).
 *
 * ts-fsrs is the canonical open-source implementation of FSRS.  Our default
 * weights are a prefix of its default_w (17 of 19, with the trailing two only
 * needed by the short-term scheduler which we disable).  We drive identical
 * (score, timestamp) sequences through both and assert (difficulty, stability)
 * match to 4 decimals at each step.
 *
 * If these fail, we are off-spec.  If they pass, our implementation matches
 * the reference and any drift noticed in production is in our data flow, not
 * our math.
 */
import { describe, it, expect } from 'vitest'
import {
	fsrs,
	createEmptyCard,
	generatorParameters,
	type Card as TsFsrsCard,
	type Grade,
} from 'ts-fsrs'
import { calculateFSRS, type Score } from './fsrs'
import type { CardReviewType } from './schemas'

// Configure ts-fsrs to match our single-phase scheduling:
//  - FSRS-5 default weights (identical to our W constants)
//  - request_retention 0.9 (our default)
//  - fuzz off (deterministic)
//  - short-term disabled — we don't model learning/relearning steps
const tsParams = generatorParameters({
	request_retention: 0.9,
	enable_fuzz: false,
	enable_short_term: false,
})
const tsf = fsrs(tsParams)

type ScoreStep = { score: Score; daysFromStart: number }

function mockReview(overrides: Partial<CardReviewType> = {}): CardReviewType {
	return {
		id: '00000000-0000-0000-0000-000000000001',
		created_at: '2025-01-01T00:00:00Z',
		uid: '00000000-0000-0000-0000-000000000002',
		day_session: '2025-01-01',
		lang: 'hin',
		phrase_id: '00000000-0000-0000-0000-000000000003',
		direction: 'forward',
		score: 3,
		day_first_review: true,
		difficulty: null,
		stability: null,
		review_time_retrievability: null,
		updated_at: null,
		...overrides,
	}
}

function runOurs(steps: Array<ScoreStep>, start: Date) {
	let prev: CardReviewType | undefined = undefined
	const trace: Array<{ step: number; difficulty: number; stability: number }> =
		[]
	for (let i = 0; i < steps.length; i++) {
		const { score, daysFromStart } = steps[i]
		const now = new Date(start.getTime() + daysFromStart * 86400_000)
		const out = calculateFSRS({ score, previousReview: prev, currentTime: now })
		trace.push({
			step: i,
			difficulty: out.difficulty,
			stability: out.stability,
		})
		prev = mockReview({
			created_at: now.toISOString(),
			difficulty: out.difficulty,
			stability: out.stability,
			score,
		})
	}
	return trace
}

function runReference(steps: Array<ScoreStep>, start: Date) {
	let card: TsFsrsCard = createEmptyCard(start)
	const trace: Array<{ step: number; difficulty: number; stability: number }> =
		[]
	for (let i = 0; i < steps.length; i++) {
		const { score, daysFromStart } = steps[i]
		const now = new Date(start.getTime() + daysFromStart * 86400_000)
		// Our Score (1-4) maps directly to ts-fsrs Grade (Rating except Manual).
		const result = tsf.next(card, now, score as unknown as Grade)
		card = result.card
		trace.push({
			step: i,
			difficulty: card.difficulty,
			stability: card.stability,
		})
	}
	return trace
}

function parityCheck(label: string, steps: Array<ScoreStep>) {
	const start = new Date('2025-01-01T00:00:00Z')
	const ours = runOurs(steps, start)
	const ref = runReference(steps, start)
	const diffs = ours.map((o, i) => ({
		step: i,
		score: steps[i].score,
		day: steps[i].daysFromStart,
		d_ours: o.difficulty,
		d_ref: ref[i].difficulty,
		d_diff: Math.abs(o.difficulty - ref[i].difficulty),
		s_ours: o.stability,
		s_ref: ref[i].stability,
		s_diff: Math.abs(o.stability - ref[i].stability),
	}))
	return { label, diffs }
}

// Fixed scenarios — the outputs of runReference are the "truth" values.
const SCENARIOS: Array<{ name: string; steps: Array<ScoreStep> }> = [
	{
		name: 'monotone Good path',
		steps: [
			{ score: 3, daysFromStart: 0 },
			{ score: 3, daysFromStart: 3 },
			{ score: 3, daysFromStart: 10 },
			{ score: 3, daysFromStart: 30 },
			{ score: 3, daysFromStart: 75 },
		],
	},
	{
		name: 'Good then Again then recovery',
		steps: [
			{ score: 3, daysFromStart: 0 },
			{ score: 3, daysFromStart: 3 },
			{ score: 1, daysFromStart: 10 }, // lapse
			{ score: 3, daysFromStart: 11 },
			{ score: 3, daysFromStart: 15 },
			{ score: 4, daysFromStart: 30 },
		],
	},
	{
		name: 'Hard and Easy mix',
		steps: [
			{ score: 2, daysFromStart: 0 },
			{ score: 3, daysFromStart: 2 },
			{ score: 4, daysFromStart: 8 },
			{ score: 2, daysFromStart: 25 },
			{ score: 3, daysFromStart: 40 },
		],
	},
	{
		name: 'Easy from day 0',
		steps: [
			{ score: 4, daysFromStart: 0 },
			{ score: 4, daysFromStart: 20 },
			{ score: 3, daysFromStart: 60 },
			{ score: 3, daysFromStart: 180 },
		],
	},
]

describe('FSRS parity with ts-fsrs (FSRS-5)', () => {
	for (const { name, steps } of SCENARIOS) {
		it(`matches reference for: ${name}`, () => {
			const { diffs } = parityCheck(name, steps)

			// Print the comparison for failure diagnosis (vitest shows console on fail)
			for (const d of diffs) {
				if (d.d_diff > 1e-6 || d.s_diff > 1e-6) {
					console.warn(
						`drift at step ${d.step} (day ${d.day}, score ${d.score}): ` +
							`D ours=${d.d_ours.toFixed(8)} ref=${d.d_ref.toFixed(8)} Δ=${d.d_diff.toExponential(2)}; ` +
							`S ours=${d.s_ours.toFixed(8)} ref=${d.s_ref.toFixed(8)} Δ=${d.s_diff.toExponential(2)}`
					)
				}
			}

			// We match ts-fsrs to ~1 part per million. The remaining drift is
			// floating-point non-associativity (same math, different operation
			// order). 4 decimals (~5e-5 abs) is strict enough to catch any real
			// semantic divergence — e.g. if we started using D' instead of D in
			// the stability update, drift would be much larger than this budget.
			for (const d of diffs) {
				expect(d.d_ours, `difficulty @ step ${d.step}`).toBeCloseTo(d.d_ref, 6)
				expect(d.s_ours, `stability @ step ${d.step}`).toBeCloseTo(d.s_ref, 4)
			}
		})
	}
})
