// oxlint-disable no-await-in-loop
// These scenes use the TypeScript scene() API instead of Markdown because the
// review manifest size is dynamic. The daily_review_goal DB constraint only
// allows values [10, 15, 20], so a predictably small manifest (e.g. 3 cards)
// is not achievable via setup directives. We query the actual manifest after
// session creation and loop over however many entries exist.

import assert from 'node:assert/strict'
import { test } from '@scenetest/scenes'
import type { Page } from 'playwright'
import {
	clearReviewSession,
	pollUntil,
	supabase,
	todayString,
} from '../support/db'

/** Reveal the current card if it is still face-down, then score it. */
async function scoreCurrentCard(page: Page, ratingTestId: string) {
	const reveal = page.getByTestId('reveal-answer-button')
	if (await reveal.isVisible({ timeout: 3000 }).catch(() => false)) {
		await reveal.click()
	}
	const ratingBtn = page.getByTestId(ratingTestId)
	await ratingBtn.waitFor({ state: 'visible', timeout: 5000 })
	await ratingBtn.click()
	await page.waitForTimeout(600)
}

/** True once the review-complete screen has taken over from the flashcard. */
function atCompleteScreen(page: Page) {
	return page
		.getByTestId('review-complete-page')
		.isVisible({ timeout: 300 })
		.catch(() => false)
}

/** The stage of the newest milestone — the session's current stage. */
async function latestMilestoneStage(uid: string, lang: string) {
	const { data } = await supabase
		.from('user_review_milestone')
		.select('stage')
		.eq('uid', uid)
		.eq('lang', lang)
		.eq('day_session', todayString())
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
	return data?.stage ?? null
}

test('learner completes a review session', async ({ actor, team }) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const uid = learner.key
	let testStart = ''

	await learner
		.do(async () => {
			testStart = new Date().toISOString()
			await clearReviewSession(uid, lang)
		})
		.openTo('/login')
		.typeInto('email-input', learner.email!)
		.typeInto('password-input', learner.password!)
		.click('submit-button')
		.notSee('login-form')
		.openTo(`/learn/${lang}/review`)
		.up()
		.ifClick('review-intro-dismiss')
		.see('review-setup-page')
		.up()
		.click('start-review-button')
		.up()
		.see('review-preview-page')
		.click('start-review-from-preview-button')
		.up()
		.see('review-session-page')
		.see('flashcard')
		.do(async (page) => {
			const { data: session } = await supabase
				.from('user_review_session')
				.select('manifest')
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', todayString())
				.maybeSingle()
			const manifest = (session?.manifest as string[]) ?? []
			for (const _ of manifest) {
				if (await atCompleteScreen(page)) break
				await scoreCurrentCard(page, 'rating-good-button')
			}
		})
		.see('review-complete-page')
		.do(async () => {
			await clearReviewSession(uid, lang)
			if (testStart) {
				await supabase
					.from('user_card')
					.delete()
					.eq('uid', uid)
					.eq('lang', lang)
					.gte('created_at', testStart)
			}
		})
})

test('learner completes stage 1 then clears the again-cards round', async ({
	actor,
	team,
}) => {
	// Ported from the retired e2e specs `reviews.spec.ts` tests 2 and 3. The
	// regression under guard: entering the again-cards round must persist
	// stage 4 and stay there. An earlier bug had WhenComplete's effect write
	// stage 5 the moment the round opened, marking the session complete while
	// the learner still had cards to re-review.
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const uid = learner.key
	let testStart = ''
	let againCount = 0

	await learner
		.do(async () => {
			testStart = new Date().toISOString()
			await clearReviewSession(uid, lang)
		})
		.openTo('/login')
		.typeInto('email-input', learner.email!)
		.typeInto('password-input', learner.password!)
		.click('submit-button')
		.notSee('login-form')
		.openTo(`/learn/${lang}/review`)
		.up()
		.ifClick('review-intro-dismiss')
		.see('review-setup-page')
		.up()
		.click('start-review-button')
		.up()
		.see('review-preview-page')
		.click('start-review-from-preview-button')
		.up()
		.see('review-session-page')
		.see('flashcard')
		.do(async (page) => {
			const { data: session } = await supabase
				.from('user_review_session')
				.select('manifest')
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', todayString())
				.maybeSingle()
			const manifest = (session?.manifest as string[]) ?? []
			againCount = 0
			// Every third card gets "again" so the round has cards to clear.
			for (let i = 0; i < manifest.length; i++) {
				if (await atCompleteScreen(page)) break
				const useAgain = (i + 1) % 3 === 0
				if (useAgain) againCount++
				await scoreCurrentCard(
					page,
					useAgain ? 'rating-again-button' : 'rating-good-button'
				)
			}
		})
		.see('review-complete-page')
		.see('review-step-3-heading')
		.do(async (page) => {
			await page
				.getByText(`Review cards (${againCount})`)
				.waitFor({ state: 'visible', timeout: 5000 })

			// Every card scored, so the whole manifest has a stage-1 review.
			const { count } = await supabase
				.from('user_card_review')
				.select('id', { count: 'exact', head: true })
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', todayString())
				.eq('stage', 1)
			const { data: session } = await supabase
				.from('user_review_session')
				.select('manifest')
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', todayString())
				.maybeSingle()
			const manifest = (session?.manifest ?? []) as string[]
			assert.equal(
				count,
				manifest.length,
				'every manifest entry should have one stage-1 review'
			)

			const stage = await latestMilestoneStage(uid, lang)
			assert.ok(
				stage === null || stage < 5,
				`session should not be complete while ${againCount} again-cards remain (stage ${stage})`
			)
		})
		.click('review-again-cards-button')
		.up()
		.see('flashcard')
		.do(async () => {
			const settled = await pollUntil(
				async () => (await latestMilestoneStage(uid, lang)) === 4
			)
			assert.ok(
				settled,
				'opening the again-cards round should persist stage 4, not 5'
			)
		})
		.do(async (page) => {
			// Re-score each again-card as "good"; +2 iterations of slack in case
			// the round opens on a card that was already cleared.
			for (let i = 0; i < againCount + 2; i++) {
				if (await atCompleteScreen(page)) break
				await scoreCurrentCard(page, 'rating-good-button')
			}
		})
		.see('review-complete-page')
		.see('review-complete-heading')
		.do(async () => {
			const completed = await pollUntil(
				async () => (await latestMilestoneStage(uid, lang)) === 5
			)
			assert.ok(
				completed,
				'clearing the again-cards round completes the session'
			)

			// The re-reviews are tracking-only stage-3 rows; the stage-1 scoring
			// rows they follow stay untouched.
			const { count: stage3Count } = await supabase
				.from('user_card_review')
				.select('id', { count: 'exact', head: true })
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', todayString())
				.eq('stage', 3)
			assert.equal(
				stage3Count,
				againCount,
				'each again-card should record one stage-3 re-review'
			)
		})
		.do(async () => {
			await clearReviewSession(uid, lang)
			if (testStart) {
				await supabase
					.from('user_card')
					.delete()
					.eq('uid', uid)
					.eq('lang', lang)
					.gte('created_at', testStart)
			}
		})
})

test('learner re-scores a card and the review row is corrected in place', async ({
	actor,
	team,
}) => {
	// Ported from the retired e2e spec `reviews.spec.ts` test 1. Going back to
	// an already-scored card and picking a different rating is a correction:
	// the existing row is amended, so the session keeps exactly one scoring
	// review per card rather than appending a second one.
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const uid = learner.key
	const day = todayString()
	let testStart = ''
	let phraseId = ''
	let direction = ''
	let firstReviewId = ''
	let firstCreatedAt = ''
	let firstUpdatedAt = ''

	await learner
		.do(async () => {
			testStart = new Date().toISOString()
			await clearReviewSession(uid, lang)
			// The hard/easy ratings only render in 4-button mode; the deck-level
			// setting overrides the profile default.
			await supabase
				.from('user_deck')
				.update({ review_answer_mode: '4-buttons' })
				.eq('uid', uid)
				.eq('lang', lang)
		})
		.openTo('/login')
		.typeInto('email-input', learner.email!)
		.typeInto('password-input', learner.password!)
		.click('submit-button')
		.notSee('login-form')
		.openTo(`/learn/${lang}/review`)
		.up()
		.ifClick('review-intro-dismiss')
		.see('review-setup-page')
		.up()
		.click('start-review-button')
		.up()
		.see('review-preview-page')
		.click('start-review-from-preview-button')
		.up()
		.see('review-session-page')
		.see('flashcard')
		.do(async () => {
			// The manifest is the authoritative card order, so entry 0 is the
			// card the session opens on.
			const { data: session } = await supabase
				.from('user_review_session')
				.select('manifest')
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', day)
				.maybeSingle()
			const manifest = (session?.manifest as string[]) ?? []
			assert.ok(manifest.length > 1, 'need at least two cards to navigate back')
			;[phraseId, direction] = manifest[0].split(':')
		})
		.do(async (page) => {
			await scoreCurrentCard(page, 'rating-hard-button')
		})
		.do(async () => {
			const scored = await pollUntil(async () => {
				const { data } = await supabase
					.from('user_card_review')
					.select('*')
					.eq('uid', uid)
					.eq('phrase_id', phraseId)
					.eq('direction', direction)
					.eq('day_session', day)
				return data?.length === 1 && data[0].score === 2
			})
			assert.ok(scored, 'scoring "hard" writes one review row with score 2')

			const { data: rows } = await supabase
				.from('user_card_review')
				.select('*')
				.eq('uid', uid)
				.eq('phrase_id', phraseId)
				.eq('direction', direction)
				.eq('day_session', day)
			const review = rows![0]
			firstReviewId = review.id
			firstCreatedAt = review.created_at
			firstUpdatedAt = review.updated_at!
			assert.equal(
				review.stage,
				1,
				'a first-pass review is recorded at stage 1'
			)
			assert.ok(
				(review.difficulty ?? 0) > 0 && (review.stability ?? 0) > 0,
				'FSRS difficulty and stability are computed on the scoring pass'
			)
		})
		// Scoring advances to the next card; step back to the one just scored.
		.click('review-previous-card-button')
		.up()
		.do(async (page) => {
			// Stepping back must land on the card we just scored. The rating row
			// is a sibling of the flashcard, not a child, so it is matched on the
			// page rather than scoped to the card.
			await page
				.locator(`[data-name="flashcard"][data-key="${phraseId}"]`)
				.waitFor({ state: 'visible', timeout: 5000 })

			// The previous answer is marked with a ring rather than disabled — the
			// learner is allowed to change their mind.
			const hardButton = page.getByTestId('rating-hard-button')
			await hardButton.waitFor({ state: 'visible', timeout: 5000 })
			assert.ok(
				await hardButton.isEnabled(),
				'the previously-picked rating stays clickable'
			)
			const cls = (await hardButton.getAttribute('class')) ?? ''
			assert.match(
				cls,
				/ring-primary/,
				'the previously-picked rating carries the ring indicator'
			)
			await page.getByTestId('rating-easy-button').first().click()
			await page.waitForTimeout(600)
		})
		.do(async () => {
			const corrected = await pollUntil(async () => {
				const { data } = await supabase
					.from('user_card_review')
					.select('*')
					.eq('uid', uid)
					.eq('phrase_id', phraseId)
					.eq('direction', direction)
					.eq('day_session', day)
				return data?.length === 1 && data[0].score === 4
			})
			assert.ok(corrected, 're-scoring "easy" leaves one row, now score 4')

			const { data: rows } = await supabase
				.from('user_card_review')
				.select('*')
				.eq('uid', uid)
				.eq('phrase_id', phraseId)
				.eq('direction', direction)
				.eq('day_session', day)
			const review = rows![0]
			assert.equal(review.id, firstReviewId, 'the same row was amended')
			assert.equal(
				review.created_at,
				firstCreatedAt,
				'a correction does not restamp created_at'
			)
			assert.notEqual(
				review.updated_at,
				firstUpdatedAt,
				'a correction restamps updated_at'
			)
			assert.equal(review.stage, 1, 'a correction stays on the scoring pass')
		})
		.do(async () => {
			await clearReviewSession(uid, lang)
			await supabase
				.from('user_deck')
				.update({ review_answer_mode: null })
				.eq('uid', uid)
				.eq('lang', lang)
			if (testStart) {
				await supabase
					.from('user_card')
					.delete()
					.eq('uid', uid)
					.eq('lang', lang)
					.gte('created_at', testStart)
			}
		})
})
