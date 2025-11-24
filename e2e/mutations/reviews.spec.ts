import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_USER_UID } from '../helpers/auth-helpers'
import {
	getReviewSessionState,
	cleanupReviewSession,
} from '../helpers/db-helpers'
import { getReviewSessionBoth } from '../helpers/both-helpers'
import { todayString } from '../../src/lib/utils'

const TEST_LANG = 'hin' // Hindi - has test data

test.describe('Review Mutations', () => {
	let sessionDate: string

	// Cleanup any existing review session before starting
	test.beforeAll(async () => {
		const { data: existingSession } = await getReviewSessionState(
			TEST_USER_UID,
			TEST_LANG
		)
		if (existingSession) {
			await cleanupReviewSession(
				TEST_USER_UID,
				TEST_LANG,
				existingSession.day_session
			)
		}
	})

	test('0. create daily review session', async ({ page }) => {
		await loginAsTestUser(page)

		// Navigate to Hindi deck page
		await expect(page).toHaveURL(/\/learn/)
		await expect(page.getByText('Hindi')).toBeVisible()
		await page.getByText('Hindi').click()

		// Should be on the deck page now
		await expect(page).toHaveURL(/\/learn\/hin$/)

		// Click Review link in the navigation
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /review/i })
			.click()

		// Should be on review index page
		await expect(page).toHaveURL(/\/learn\/hin\/review/)

		// Verify card count information is visible
		await expect(page.getByText(/Total Cards/i)).toBeVisible()
		await expect(page.getByText(/Scheduled/)).toBeVisible()
		await expect(page.getByText(/New Phrases/i)).toBeVisible()

		// Click "Start Today's Review" button
		await page.click('button:has-text("Start Today\'s Review")')

		// Wait for toast message
		await expect(page.getByText(/Ready to go!/i)).toBeVisible()

		// Should navigate to review go page (first card)
		await page.waitForURL(/\/learn\/hin\/review\/go/)

		// Verify we're on a card review page
		await expect(page.getByText(/Card \d+ of \d+/)).toBeVisible()

		// Get today's date for session key
		const today = todayString()
		sessionDate = today

		// Use helper to get both DB and local session
		const { fromDB, fromLocal } = await getReviewSessionBoth(
			page,
			TEST_USER_UID,
			TEST_LANG,
			today
		)

		// Verify DB session (with type safety from parsed schema)
		expect(fromDB).toBeTruthy()
		expect(fromDB!.uid).toBe(TEST_USER_UID)
		expect(fromDB!.lang).toBe(TEST_LANG)
		expect(fromDB!.manifest).toBeTruthy()
		expect(Array.isArray(fromDB!.manifest)).toBe(true)
		expect(fromDB!.manifest!.length).toBeGreaterThan(0)

		// Verify local collection session
		expect(fromLocal).toBeTruthy()
		expect(fromLocal!.lang).toBe(TEST_LANG)
		expect(fromLocal!.manifest).toBeTruthy()
		expect(Array.isArray(fromLocal!.manifest)).toBe(true)

		// Verify DB and collection match
		expect(fromLocal!.manifest!.length).toBe(fromDB!.manifest!.length)
		expect(fromLocal!.day_session).toBe(fromDB!.day_session)
		expect(fromLocal!.uid).toBe(fromDB!.uid)
		expect(fromLocal!.lang).toBe(fromDB!.lang)
		expect(fromLocal!.created_at).toBe(fromDB!.created_at)
	})

	test.afterAll(async () => {
		if (sessionDate) {
			await cleanupReviewSession(TEST_USER_UID, TEST_LANG, sessionDate)
		}
	})

	test.skip('1. useReviewMutation: submit first card review, edit it', async ({
		page,
	}) => {
		// await loginAsTestUser(page)
		// TODO: Implement first card review test
		// Navigate to review page
		// Expect the review to be ongoing
		// Submit a review with a score (1-4)
		// Expect a toast to come up according to the review mutation's onSuccess conditions
		// Verify review record created in DB
		// Verify card stats updated (difficulty, stability, retrievability)
		// Verify day_first_review=true
		// Verify the same info is in the local collection
		// After the review, use the buton to navigate to the previous card
		// Confirm the previously-answered option is disabled right now
		// Give a different answer this time to update or "correct" the answer
		// Expect the toast to confirm
		// Check the database and collection to ensure:
		// 1. the previous record was updated (a new review one was not created; there is only one review today for this phrase)
		// 2. the record pre-update and post-update have the uid, lang, day_session, phrase_id, review_time_retrievability, created_at
		// 3. the record post-update still has day_first_review=true
		// 4. the record post-update has a different value for: score, difficulty, stability, updated_at
		// Go forward two cards, confirm two changes in text
		// Go back two cards, confirm the most recent result's button is disabled
		// Change the answer again and expect the second card to come, then we're done.
	})

	test.skip('2. useReviewMutation: submit reviews in stage 1', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement multiple reviews test
		// Continue in-progress review session, expect the page to open to the second card (because the first has been reviewed already in step 1)
		// Submit reviews for each card in the list, giving some cards a score of 1 (and remember which ones), and skipping other cards (remember which ones)
		// Verify all reviews are recorded in DB and local collection
		// Verify session state updates correctly
		// Expect us to get to the screen that says "Step 2 of 3" and "Review Skipepd cards"
		// Expect the number of "skipped" cards listed on this page matches what we know we skipped
		// Expect the local collection and DB to have the same number of reviews as today's manifest lengh minus the number of skipped cards
	})

	test.skip('3. End of review stage 1 through stage 3', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement edit review test
		// Continue in-progress review session
		// Expect it to be on the screen that says "Step 2 of 3" and "Review Skipepd cards"
		// Click "Review Skipped cards" button
		// Verify the card is in our list of skipped cards from step
		// Review each skipped card, confirming it's in our list, adding to the list of "Again" cards whenever we answer (1)
		// Confirm the new reviews are in the database and collection
		// Expect to land up on the final page that says "Step 3 of 3" and "Review cards (XX)"
		// Expect the number of cards it says I have to review is equal to the number of cards we answered (1) for
		// Click the button to review the other cards, mark them all (3)
		// Confirm that each new review created a new review with day_first_review=false
		// Confirm the second reviews have the same difficulty and stability as their first-review counterparts, but different score
		// Expect the page to say "You've completed your review for today."
	})

	test.skip('4. useReviewMutation: verify FSRS algorithm calculations', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement FSRS verification test
		// Review a card with known initial state
		// Submit review with specific score
		// Verify difficulty calculation is correct
		// Verify stability calculation is correct
		// Verify retrievability updates correctly
	})

	test.skip('5. useReviewMutation: handle review session interruption', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement session interruption test
		// Start review session
		// Submit some reviews
		// Leave page / close browser
		// Return later same day
		// Verify session state restored
		// Verify can continue reviewing
		// Clear local storage; clear local collection; refresh page
		// Expect to be on the page "Continue your {languages[lang]} flash card review"
		// Click the "Continue Review" button in the card footer
		// Expect to land on a phrase review where we left off
	})
})
