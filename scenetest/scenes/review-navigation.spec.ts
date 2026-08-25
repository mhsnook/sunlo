// Ported from the retired e2e spec `review-navigation.spec.ts`.
//
// This is a timing scene, not a journey: the point is that clicks land faster
// than the card-slide animation finishes. The Markdown surface settles between
// steps, which is exactly the wait this scene must not do, so the rapid clicks
// run inside a `do()` block with no awaits between them.

import assert from 'node:assert/strict'
import { test } from '@scenetest/scenes'
import type { Page } from 'playwright'
import { clearReviewSession, supabase, pollUntil } from '../support/db'

/** Read "Card 3 of 12" off the counter and return the 3. */
async function currentCardNumber(page: Page) {
	const text = await page.getByTestId('review-card-counter').textContent()
	const match = text?.match(/Card (\d+) of (\d+)/)
	return match ? Number(match[1]) : null
}

async function totalCards(page: Page) {
	const text = await page.getByTestId('review-card-counter').textContent()
	const match = text?.match(/Card \d+ of (\d+)/)
	return match ? Number(match[1]) : 0
}

/** Wait for the animations to settle on an expected card number. */
async function settlesOnCard(page: Page, expected: number) {
	return pollUntil(async () => (await currentCardNumber(page)) === expected, {
		timeoutMs: 5000,
	})
}

test('rapid card navigation is not blocked by animations', async ({
	actor,
	team,
}) => {
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
		.see('review-card-counter')
		.do(async (page) => {
			const total = await totalCards(page)
			assert.ok(
				total >= 5,
				`rapid navigation needs at least 5 cards, session has ${total}`
			)
			assert.equal(
				await currentCardNumber(page),
				1,
				'a fresh session opens on card 1'
			)

			const next = page.getByTestId('review-next-card-button')
			const prev = page.getByTestId('review-previous-card-button')

			// Four forward clicks with no wait between them.
			await next.click()
			await next.click()
			await next.click()
			await next.click()
			assert.ok(
				await settlesOnCard(page, 5),
				'four rapid Next clicks advance four cards'
			)

			// Three back clicks with no wait between them.
			await prev.click()
			await prev.click()
			await prev.click()
			assert.ok(
				await settlesOnCard(page, 2),
				'three rapid Previous clicks go back three cards'
			)

			// Mixed directions: +1, +1, -1, +1 nets out at +2.
			await next.click()
			await next.click()
			await prev.click()
			await next.click()
			assert.ok(
				await settlesOnCard(page, 4),
				'a rapid forward-and-back mix nets out to the right card'
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
