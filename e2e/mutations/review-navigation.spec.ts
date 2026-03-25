import { test, expect, TestInfo } from '@playwright/test'
import { getTestUserForProject } from '../helpers/auth-helpers'
import {
	getReviewSessionState,
	cleanupReviewSession,
} from '../helpers/db-helpers'
import { todayString } from '../../src/lib/utils'
import { goToLearnPage, goToDeckPage } from '../helpers/goto-helpers'
import { TEST_LANG } from '../helpers/test-constants'

test.describe.serial('Review Card Navigation', () => {
	const sessionDate = todayString()

	// oxlint-disable-next-line no-empty-pattern
	test.beforeAll(async ({}, workerInfo) => {
		const { uid } = getTestUserForProject(workerInfo as unknown as TestInfo)
		const { data: existingSession } = await getReviewSessionState(
			uid,
			TEST_LANG,
			sessionDate
		)
		if (existingSession) {
			await cleanupReviewSession(uid, TEST_LANG, sessionDate)
		}
	})
	// oxlint-disable-next-line no-empty-pattern
	test.afterAll(async ({}, workerInfo) => {
		const { uid } = getTestUserForProject(workerInfo as unknown as TestInfo)
		await cleanupReviewSession(uid, TEST_LANG, sessionDate)
	})

	test('rapid card navigation is not blocked by animations', async ({
		page,
	}) => {
		await goToLearnPage(page)
		await goToDeckPage(page, TEST_LANG)

		// Create a review session
		await page.getByRole('button', { name: "Start Today's Review" }).click()
		await expect(page.getByText(/Ready to go!/i)).toBeVisible()
		await page.waitForURL(new RegExp(`/learn/${TEST_LANG}/review/preview`))

		const startReviewButton = page.getByRole('button', {
			name: 'Start Review',
		})
		await startReviewButton.scrollIntoViewIfNeeded()
		await startReviewButton.click()

		// Wait for the review session to load
		const cardCounter = page.getByText(/Card \d+ of \d+/)
		await expect(cardCounter).toBeVisible({ timeout: 10000 })

		// Verify we start at card 1
		await expect(cardCounter).toHaveText(/Card 1 of \d+/)

		// Extract total card count
		const counterText = await cardCounter.textContent()
		const totalCards = Number(counterText!.match(/of (\d+)/)![1])
		// We need at least 5 cards to test rapid navigation
		expect(totalCards).toBeGreaterThanOrEqual(5)

		const nextBtn = page.getByRole('button', { name: 'Next card' })
		const prevBtn = page.getByRole('button', { name: 'Previous card' })

		// Rapidly click "Next" 4 times without waiting for animations
		await nextBtn.click()
		await nextBtn.click()
		await nextBtn.click()
		await nextBtn.click()

		// Wait for animations to settle, then verify we advanced 4 cards
		await expect(cardCounter).toHaveText(/Card 5 of \d+/, { timeout: 3000 })

		// Rapidly click "Previous" 3 times without waiting
		await prevBtn.click()
		await prevBtn.click()
		await prevBtn.click()

		// Verify we went back 3 cards
		await expect(cardCounter).toHaveText(/Card 2 of \d+/, { timeout: 3000 })

		// Rapid forward-backward mix: next, next, prev, next
		await nextBtn.click()
		await nextBtn.click()
		await prevBtn.click()
		await nextBtn.click()

		// Net movement: +2, should be at card 4
		await expect(cardCounter).toHaveText(/Card 4 of \d+/, { timeout: 3000 })
	})
})
