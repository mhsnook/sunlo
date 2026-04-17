// oxlint-disable no-await-in-loop
// These scenes use the TypeScript scene() API instead of Markdown because the
// review manifest size is dynamic. The daily_review_goal DB constraint only
// allows values [10, 15, 20], so a predictably small manifest (e.g. 3 cards)
// is not achievable via setup directives. We query the actual manifest after
// session creation and loop over however many entries exist.

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

// Inlined from src/lib/utils to avoid pulling in browser-only imports (sonner)
function todayString() {
	const now = new Date()
	now.setHours(now.getHours() - 4)
	const pad = (n: number) => `0${n}`.slice(-2)
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test('learner completes a review session', async ({ actor, team }) => {
	const lang = team.tags!.lang
	const learner = await actor('learner')
	const uid = learner.key
	let testStart = ''

	await learner
		.do(async () => {
			testStart = new Date().toISOString()
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

test('learner completes stage 1 with mixed scores', async ({ actor, team }) => {
	const lang = team.tags!.lang
	const learner = await actor('learner')
	const uid = learner.key
	let testStart = ''
	let againCount = 0

	await learner
		.do(async () => {
			testStart = new Date().toISOString()
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
			againCount = 0
			for (let i = 0; i < manifest.length; i++) {
				if (
					await page
						.getByTestId('review-complete-page')
						.isVisible({ timeout: 300 })
						.catch(() => false)
				)
					break
				const useAgain = (i + 1) % 3 === 0
				if (useAgain) againCount++
				const reveal = page.getByTestId('reveal-answer-button')
				if (await reveal.isVisible({ timeout: 3000 }).catch(() => false)) {
					await reveal.click()
				}
				const ratingBtn = page.getByTestId(
					useAgain ? 'rating-again-button' : 'rating-good-button'
				)
				await ratingBtn.waitFor({ state: 'visible', timeout: 5000 })
				await ratingBtn.click()
				await page.waitForTimeout(600)
			}
		})
		.see('review-complete-page')
		.do(async (page) => {
			await page
				.getByText('Step 3 of 3')
				.waitFor({ state: 'visible', timeout: 5000 })
			await page
				.getByText(`Review cards (${againCount})`)
				.waitFor({ state: 'visible', timeout: 5000 })
		})
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
