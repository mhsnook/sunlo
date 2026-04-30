// oxlint-disable no-await-in-loop
// Issue #156 - "Possible bug in most_recent_review_at"
//
// After a review, the deck meta fields `count_reviews_7d` and
// `most_recent_review_at` should update together. The issue report showed
// count_reviews_7d moving while most_recent_review_at stayed stale, and a
// follow-up noted that the "last activity" badge read "1 month" even when
// there had been no activity (null formatting bug in ago()).
//
// This scene wipes the learner's recent reviews, does one review, and then
// asserts on both the server row AND the rendered UI that the two fields
// agree. If the bug regresses, either the assertion on the DB row or the
// assertion that the "most recent review" badge is visible will fail.

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const pad = (n: number) => `0${n}`.slice(-2)

function todayString() {
	const now = new Date()
	now.setHours(now.getHours() - 4)
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test('review updates most_recent_review_at and count_reviews_7d together', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang
	const learner = await actor('learner')
	const uid = learner.key
	let testStart = ''

	await learner
		.do(async () => {
			testStart = new Date().toISOString()
			// Clear out reviews so the deck meta starts from a known zero state.
			await supabase
				.from('user_card_review')
				.delete()
				.eq('uid', uid)
				.eq('lang', lang)
			await supabase
				.from('user_deck_review_state')
				.delete()
				.eq('uid', uid)
				.eq('lang', lang)
		})
		.openTo('/login')
		.typeInto('email-input', learner.email!)
		.typeInto('password-input', learner.password!)
		.click('submit-button')
		.notSee('login-form')
		// Confirm the deck tile shows up before we kick off a review.
		.openTo('/learn')
		.see(`deck-tile-${lang}`)
		// Run one review session end to end.
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
				.from('user_deck_review_state')
				.select('manifest')
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', todayString())
				.maybeSingle()
			const manifest = (session?.manifest as string[]) ?? []
			for (const _ of manifest) {
				if (
					await page
						.getByTestId('review-complete-page')
						.isVisible({ timeout: 300 })
						.catch(() => false)
				)
					break
				const reveal = page.getByTestId('reveal-answer-button')
				if (await reveal.isVisible({ timeout: 3000 }).catch(() => false)) {
					await reveal.click()
				}
				await page.getByTestId('rating-good-button').click()
				await page.waitForTimeout(600)
			}
		})
		.see('review-complete-page')
		// Server-side invariant: the two fields must agree after a review.
		// (count_reviews_7d and most_recent_review_at live on user_deck_plus.)
		.do(async () => {
			const { data: deck } = await supabase
				.from('user_deck_plus')
				.select('count_reviews_7d, most_recent_review_at')
				.eq('uid', uid)
				.eq('lang', lang)
				.single()

			if (!deck) throw new Error('Expected a user_deck_plus row after review')
			if (!deck.count_reviews_7d || deck.count_reviews_7d < 1) {
				throw new Error(
					`Expected count_reviews_7d > 0 after reviewing; got ${deck.count_reviews_7d}`
				)
			}
			if (!deck.most_recent_review_at) {
				throw new Error(
					'count_reviews_7d incremented but most_recent_review_at is still null (#156)'
				)
			}
			// The new timestamp should be from this test run, not a stale value.
			if (deck.most_recent_review_at < testStart) {
				throw new Error(
					`most_recent_review_at (${deck.most_recent_review_at}) is older than the test start (${testStart}); did not update`
				)
			}
		})
		// UI-side invariant: the "reviews this week" AND "most recent review"
		// badges both appear in the deck-stats card on /learn/$lang/stats.
		// If count_reviews_7d updated but most_recent_review_at didn't, the
		// latter badge would be missing — which is exactly the #156 failure
		// mode. (DeckStatsBadges only renders on /learn/$lang/stats now,
		// after the learn-page redesign.)
		.openTo(`/learn/${lang}/stats`)
		.see('badge-count-reviews-7d')
		.see('badge-most-recent-review')
		.notSee('badge-no-reviews-7d')
		.do(async () => {
			await supabase
				.from('user_card_review')
				.delete()
				.eq('uid', uid)
				.eq('lang', lang)
			await supabase
				.from('user_deck_review_state')
				.delete()
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

test('deck with no reviews does not show a most-recent-review badge', async ({
	actor,
	team,
}) => {
	// The follow-up comment on #156 reported that the "last activity" badge
	// rendered "1 month" when there was no activity at all. The correct
	// behavior is: if most_recent_review_at is null, the badge should not
	// render. This scene clears reviews and asserts the badge is absent.
	const lang = team.tags!.lang
	const learner = await actor('learner')
	const uid = learner.key

	await learner
		.do(async () => {
			await supabase
				.from('user_card_review')
				.delete()
				.eq('uid', uid)
				.eq('lang', lang)
			await supabase
				.from('user_deck_review_state')
				.delete()
				.eq('uid', uid)
				.eq('lang', lang)
		})
		.openTo('/login')
		.typeInto('email-input', learner.email!)
		.typeInto('password-input', learner.password!)
		.click('submit-button')
		.notSee('login-form')
		.openTo(`/learn/${lang}/stats`)
		.see('badge-no-reviews-7d')
		.notSee('badge-most-recent-review')
})
