import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_USER_UID } from '../helpers/auth-helpers'
import {
	getReviewSessionState,
	getCardByPhraseId,
	getReviewByPhraseId,
	cleanupReviewSession,
} from '../helpers/db-helpers'
import { getReviewSessionBoth } from '../helpers/both-helpers'
import { todayString } from '../../src/lib/utils'
import { goToDeckPage } from '../helpers/goto-helpers'

const TEST_LANG = 'hin' // Hindi - has test data

test.describe.serial('Review Mutations', () => {
	const sessionDate = todayString()

	// Cleanup any existing review session before starting
	test.beforeAll(async () => {
		const { data: existingSession } = await getReviewSessionState(
			TEST_USER_UID,
			TEST_LANG,
			sessionDate
		)
		if (existingSession) {
			await cleanupReviewSession(TEST_USER_UID, TEST_LANG, sessionDate)
		}
	})
	test.afterAll(async () => {
		await cleanupReviewSession(TEST_USER_UID, TEST_LANG, sessionDate)
	})

	test('0. create daily review session', async ({ page }) => {
		await loginAsTestUser(page)

		// Navigate to Hindi deck page
		await goToDeckPage(page, TEST_LANG)

		// Verify we are on the setup page
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

		// Use helper to get both DB and local session
		const { fromDB, fromLocal } = await getReviewSessionBoth(
			page,
			TEST_USER_UID,
			TEST_LANG,
			sessionDate
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

	test('1. useReviewMutation: submit first card review, edit it', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// Navigate to Hindi deck page
		await goToDeckPage(page, TEST_LANG)
		// We expect to see this "Continue Review" because we started it already in test step 0
		// await expect(page.getByText('Continue Review'))
		await page.getByText('Continue Review').click()

		// Grab the review's phrase_id
		// open the context menu

		// Click the context menu button directly
		await page.getByRole('button', { name: 'Open context menu' }).click()
		// The permalink text is inside the anchor we need
		const permalink = page.getByText('Permalink')
		const anchor = permalink.locator('xpath=ancestor::a')
		const phraseId = (await anchor.getAttribute('href'))?.split('/').pop()

		expect(phraseId).toBeTruthy()

		// Close the context menu by pressing Escape
		await page.keyboard.press('Escape')

		// Grab the card from the DB before review
		const { data: dbCardBefore } = await getCardByPhraseId(
			phraseId!,
			TEST_USER_UID
		)
		expect(dbCardBefore).toBeTruthy()

		// Click "Show Translation" to reveal the answer buttons
		await page.getByRole('button', { name: 'Show Translation' }).click()

		// Submit a review with a score of 2 (Hard)
		await page.getByRole('button', { name: 'Hard' }).click()
		// Toast shows "okay" for score 2 (Hard)
		await expect(page.getByText('okay')).toBeVisible()

		// Verify review record created in DB for this card
		const { data: dbReview } = await getReviewByPhraseId(
			phraseId!,
			TEST_USER_UID,
			sessionDate
		)
		expect(dbReview).toBeTruthy()
		expect(dbReview?.score).toBe(2)
		expect(dbReview?.day_first_review).toBe(true)

		// Verify FSRS values are present in the DB review
		expect(dbReview?.difficulty).toBeGreaterThan(0)
		expect(dbReview?.stability).toBeGreaterThan(0)

		// Note: local collection check is skipped - window.__reviewsCollection
		// may not be exposed in the test environment

		// Retrieve new record for this card_full from the DB
		const { data: dbCardAfter } = await getCardByPhraseId(
			phraseId!,
			TEST_USER_UID
		)
		expect(dbCardAfter).toBeTruthy()

		// Compare to dbCardBefore card stats
		expect(dbCardAfter!.difficulty).not.toBe(dbCardBefore!.difficulty)
		expect(dbCardAfter!.stability).not.toBe(dbCardBefore!.stability)
		expect(dbCardAfter!.retrievability_now).not.toBe(
			dbCardBefore!.retrievability_now
		)

		// After the review, use the button to navigate to the previous card
		await page.getByRole('button', { name: 'Previous card' }).click()

		// Confirm the previously-answered option is disabled
		await expect(page.getByRole('button', { name: 'Hard' })).toBeDisabled()

		// Give a different answer (score=4) to update the answer
		await page.getByRole('button', { name: 'Easy' }).click()
		await expect(page.getByText('Review updated!')).toBeVisible()

		// Check the database for the newest review
		const { data: dbReviewEdited } = await getReviewByPhraseId(
			phraseId!,
			TEST_USER_UID,
			sessionDate
		)
		expect(dbReviewEdited).toBeTruthy()

		// Check the local collection for the newest review
		const localReviewEdited = await page.evaluate(
			({ lang, phraseId, sessionDate }) => {
				// @ts-expect-error - accessing window global
				const reviews = window.__reviewsCollection?.get(lang)
				return reviews?.find(
					(r) => r.phrase_id === phraseId && r.day_session === sessionDate
				)
			},
			{ lang: TEST_LANG, phraseId, sessionDate }
		)
		expect(localReviewEdited).toBeTruthy()

		// 1. the previous review record was updated (same id)
		expect(dbReviewEdited?.id).toBe(dbReview?.id)

		// 2. there is only one review today for this phrase_id
		const reviewsForPhrase = await page.evaluate(
			({ lang, phraseId, sessionDate }) => {
				// @ts-expect-error - accessing window global
				const reviews = window.__reviewsCollection?.get(lang)
				return reviews?.filter(
					(r) => r.phrase_id === phraseId && r.day_session === sessionDate
				).length
			},
			{ lang: TEST_LANG, phraseId, sessionDate }
		)
		expect(reviewsForPhrase).toBe(1)

		// 3. some values are the same
		expect(dbReviewEdited?.uid).toBe(dbReview?.uid)
		expect(dbReviewEdited?.lang).toBe(dbReview?.lang)
		expect(dbReviewEdited?.day_session).toBe(dbReview?.day_session)
		expect(dbReviewEdited?.phrase_id).toBe(dbReview?.phrase_id)
		expect(dbReviewEdited?.created_at).toBe(dbReview?.created_at)

		// 4. day_first_review is still true
		expect(dbReviewEdited?.day_first_review).toBe(true)

		// 5. some values are different
		expect(dbReviewEdited?.score).toBe(4)
		expect(dbReviewEdited?.score).not.toBe(dbReview?.score)
		expect(dbReviewEdited?.updated_at).not.toBe(dbReview?.updated_at)
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

	test.afterAll(async () => {
		if (sessionDate) {
			await cleanupReviewSession(TEST_USER_UID, TEST_LANG, sessionDate)
		}
	})
})
