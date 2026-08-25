// Ported from the retired e2e spec `review-duplicate-cards.spec.ts`.
//
// Regression: creating a review session used to depend on the `user_card`
// upsert returning one row per card it sent. That upsert uses
// `ignoreDuplicates`, so it returns fewer rows — none at all — when the cards
// already exist in the database and only the local collection is out of date.
// The old guard then nulled the session and threw, leaving the learner with no
// review for the day.
//
// Faking the upsert response is the only way to pin the "every card already
// existed" case deterministically: which phrases today's session picks is
// decided by the recommender at click time. That needs Playwright's request
// interception, so this scene uses the `test()` surface rather than Markdown.
// The matching invariant is asserted from inside the mutation by the
// `should('review session is created even when the card upsert returns no
// rows', …)` check in `src/routes/_user/learn/$lang.review.index.tsx`.

import assert from 'node:assert/strict'
import { test } from '@scenetest/scenes'
import { clearReviewSession, supabase, todayString } from '../support/db'

test('a review session is created when every card already exists', async ({
	actor,
	team,
}) => {
	// The partial-lang deck is seeded with a card for every phrase in the
	// language, so the recommender has nothing fresh to offer and the mutation
	// skips the upsert entirely. These throwaway phrases give it candidates the
	// learner has no card for, which is what makes the upsert fire.
	const lang = team.tags!.lang_partial
	const learner = await actor('learner')
	const uid = learner.key
	const nonce = Date.now().toString(36)
	const seededPhraseIds: Array<string> = []
	let cardsSentToUpsert = 0

	await learner
		.do(async () => {
			await clearReviewSession(uid, lang)
			const { data: phrases } = await supabase
				.from('phrase')
				.insert(
					Array.from({ length: 20 }, (_, i) => ({
						lang,
						text: `Duplicate-card probe ${nonce} #${i}`,
						added_by: uid,
					}))
				)
				.select()
				.throwOnError()
			seededPhraseIds.push(...phrases!.map((p) => p.id))
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
		.do(async (page) => {
			// Answer the card upsert with an empty array: the shape PostgREST
			// returns when `ignoreDuplicates` skipped every row.
			await page.route('**/rest/v1/user_card*', async (route) => {
				const request = route.request()
				if (request.method() !== 'POST') return route.continue()
				const body = request.postDataJSON() as unknown[]
				cardsSentToUpsert = Array.isArray(body) ? body.length : 0
				return route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: '[]',
				})
			})
		})
		.click('start-review-button')
		.up()
		// A toast-error here fails the scene (see errorSelectors in config.ts).
		.seeToast('toast-success')
		.see('review-preview-page')
		.do(async (page) => {
			await page.unroute('**/rest/v1/user_card*')

			const { data: session } = await supabase
				.from('user_review_session')
				.select('manifest')
				.eq('uid', uid)
				.eq('lang', lang)
				.eq('day_session', todayString())
				.maybeSingle()
			assert.ok(session, 'the review session row should exist')
			const manifest = session!.manifest as string[]
			assert.ok(
				Array.isArray(manifest) && manifest.length > 0,
				'the session should carry a non-empty manifest'
			)
			assert.ok(
				cardsSentToUpsert > 0,
				'the scene only proves the regression if cards were sent to the upsert'
			)
		})
		.do(async () => {
			await clearReviewSession(uid, lang)
			if (seededPhraseIds.length) {
				await supabase
					.from('user_card')
					.delete()
					.in('phrase_id', seededPhraseIds)
				await supabase.from('phrase').delete().in('id', seededPhraseIds)
			}
		})
})
