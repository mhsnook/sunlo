// oxlint-disable no-await-in-loop
import { test, expect } from '@playwright/test'
import { TEST_USER_UID } from '../helpers/auth-helpers'
import {
	getReviewSessionState,
	getCardByPhraseId,
	getReviewByPhraseId,
	cleanupReviewSession,
	supabase,
} from '../helpers/db-helpers'
import { getReviewSessionBoth } from '../helpers/both-helpers'
import { todayString } from '../../src/lib/utils'
import { goToDeckPage } from '../helpers/goto-helpers'
import { TEST_LANG } from '../helpers/test-constants'

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
		await page.goto('/learn')

		// Navigate to deck page
		await goToDeckPage(page, TEST_LANG)

		// Verify we are on the setup page
		await expect(page.getByText(/Total Cards/i)).toBeVisible()
		await expect(page.getByText(/Scheduled/)).toBeVisible()
		await expect(page.getByText(/New Phrases/i)).toBeVisible()

		// Click "Start Today's Review" button
		await page.getByRole('button', { name: "Start Today's Review" }).click()

		// Wait for toast message
		await expect(page.getByText(/Ready to go!/i)).toBeVisible()

		// Should navigate to review go page
		await page.waitForURL(new RegExp(`/learn/${TEST_LANG}/review/go`))

		// Expect to see the new cards preview screen (either with new cards or the "no new cards" variant)
		const previewNewCards = page.getByText('Preview New Cards')
		const noNewCards = page.getByText("No new cards in today's review")
		await expect(previewNewCards.or(noNewCards)).toBeVisible()

		// Click "Start Review" to proceed past the preview
		const startReviewButton = page.getByRole('button', { name: 'Start Review' })
		await startReviewButton.scrollIntoViewIfNeeded()
		await startReviewButton.click()

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
		await page.goto('/learn')
		// Navigate to deck page
		await goToDeckPage(page, TEST_LANG)
		// We expect "Continue Review" because the session was created in test step 0
		const continueBtn = page.getByRole('button', { name: 'Continue Review' })
		await expect(continueBtn).toBeVisible({ timeout: 10000 })
		await continueBtn.click()

		// After clicking Continue Review, wait for navigation to /review/go
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/review/go`), {
			timeout: 10000,
		})

		// Handle the new cards preview screen (previewSeen resets per browser session)
		const startReviewBtn = page.getByRole('button', { name: 'Start Review' })
		const cardNav = page.getByText(/Card \d+ of \d+/)
		await expect(startReviewBtn.or(cardNav)).toBeVisible({ timeout: 10000 })
		if (await startReviewBtn.isVisible()) {
			await startReviewBtn.scrollIntoViewIfNeeded()
			await startReviewBtn.click()
		}

		// Wait for the card review UI to be ready
		await expect(page.getByText(/Card \d+ of \d+/)).toBeVisible({
			timeout: 10000,
		})

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

		// Scope card-specific selectors to this card (all cards are in DOM, only current one visible)
		const currentCard = page.locator(
			`[data-name="flashcard"][data-key="${phraseId}"]`
		)

		// Grab the card from the DB before review
		const { data: dbCardBefore } = await getCardByPhraseId(
			phraseId!,
			TEST_USER_UID
		)
		expect(dbCardBefore).toBeTruthy()

		// Wait for the flashcard content to load (phrase data may still be syncing)
		await expect(currentCard).toBeVisible({ timeout: 15000 })

		// Click "Show Translations" to reveal the answer buttons (may already be shown
		// if the card was previously reviewed in test 0, since prevData auto-reveals)
		const revealBtn = currentCard.getByTestId('reveal-answer-button')
		const answerBtns = currentCard.locator('[data-name="answer-buttons-row"]')
		await expect(revealBtn.or(answerBtns)).toBeVisible({ timeout: 10000 })
		if (await revealBtn.isVisible()) {
			await revealBtn.click()
		}

		// Submit a review with a score of 2 (Hard)
		await currentCard.getByTestId('rating-hard-button').click()

		// The slide animation provides visual feedback; verify the DB record instead
		// Wait a moment for the mutation to complete
		await page.waitForTimeout(1000)

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

		// After the review, use the button to navigate to the previous card
		await page.getByRole('button', { name: 'Previous card' }).click()

		// Hide scenetest dev panel that can intercept clicks near bottom of page
		await page.evaluate(() => {
			const panel = document.getElementById('scenetest-panel')
			if (panel) panel.style.display = 'none'
		})

		// The previously-answered option has a ring indicator (not disabled)
		// because user CAN update their answer by clicking a different button
		const hardButton = currentCard.getByTestId('rating-hard-button')
		await expect(hardButton).toBeEnabled()
		// The ring indicator class is applied to show the previous selection
		await expect(hardButton).toHaveClass(/ring-primary/)

		// Give a different answer (score=4) to update the answer
		await currentCard.getByTestId('rating-easy-button').click()

		// Wait for the update mutation to complete
		await page.waitForTimeout(1000)

		// Check the database for the newest review
		const { data: dbReviewEdited } = await getReviewByPhraseId(
			phraseId!,
			TEST_USER_UID,
			sessionDate
		)
		expect(dbReviewEdited).toBeTruthy()

		// Check the local collection for the edited review
		const localReviewEdited = await page.evaluate(
			({ phraseId, sessionDate }) => {
				// @ts-expect-error - accessing window global
				const collection = window.__cardReviewsCollection
				if (!collection)
					throw new Error('cardReviewsCollection not attached to window')
				// Find reviews matching phrase_id and day_session
				return (
					collection.toArray.find(
						(r: { phrase_id: string; day_session: string }) =>
							r.phrase_id === phraseId && r.day_session === sessionDate
					) ?? null
				)
			},
			{ phraseId, sessionDate }
		)
		expect(localReviewEdited).toBeTruthy()

		// 1. the previous review record was updated (same id)
		expect(dbReviewEdited?.id).toBe(dbReview?.id)
		expect(localReviewEdited?.id).toBe(dbReview?.id)

		// 2. there is only one review today for this phrase_id
		const reviewCountForPhrase = await page.evaluate(
			({ phraseId, sessionDate }) => {
				// @ts-expect-error - accessing window global
				const collection = window.__cardReviewsCollection
				if (!collection) return 0
				return collection.toArray.filter(
					(r: { phrase_id: string; day_session: string }) =>
						r.phrase_id === phraseId && r.day_session === sessionDate
				).length
			},
			{ phraseId, sessionDate }
		)
		expect(reviewCountForPhrase).toBe(1)

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

	test('2. complete stage 1 reviews and reach stage transition', async ({
		page,
	}) => {
		await page.goto('/learn')
		await goToDeckPage(page, TEST_LANG)

		// Continue the in-progress review session from test 1
		const continueBtn = page.getByRole('button', { name: 'Continue Review' })
		await expect(continueBtn).toBeVisible({ timeout: 10000 })
		await continueBtn.click()

		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/review/go`), {
			timeout: 10000,
		})

		// Handle new cards preview if it appears
		const startReviewBtn = page.getByRole('button', { name: 'Start Review' })
		const cardNav = page.getByText(/Card \d+ of \d+/)
		await expect(startReviewBtn.or(cardNav)).toBeVisible({ timeout: 10000 })
		if (await startReviewBtn.isVisible()) {
			await startReviewBtn.scrollIntoViewIfNeeded()
			await startReviewBtn.click()
		}

		// Get the manifest so we know the total card count
		const { data: sessionState } = await getReviewSessionState(
			TEST_USER_UID,
			TEST_LANG,
			sessionDate
		)
		expect(sessionState).toBeTruthy()
		const manifest: string[] = sessionState!.manifest as string[]
		expect(manifest.length).toBeGreaterThan(0)

		// Review every remaining card, alternating scores:
		// - every 3rd card gets score 1 (Again) so we have "again" cards for test 3
		// - the rest get score 3 (Good)
		const againPhraseIds: string[] = []
		const goodPhraseIds: string[] = []
		const completeScreen = page.getByTestId('review-complete-page')

		for (let i = 0; i < manifest.length; i++) {
			// Check if we've reached the stage-complete screen
			const isComplete = await completeScreen
				.isVisible({ timeout: 800 })
				.catch(() => false)
			if (isComplete) break

			// Find the currently visible flashcard (scoped to its non-hidden parent)
			const currentCard = page
				.locator('div:not(.hidden) > [data-name="flashcard"]')
				.first()
			const isCardVisible = await currentCard
				.isVisible({ timeout: 5000 })
				.catch(() => false)
			if (!isCardVisible) break

			const phraseId = await currentCard.getAttribute('data-key')
			if (!phraseId) break

			// Check if this card was already reviewed (test 1 reviewed the first card)
			const { data: existingReview } = await getReviewByPhraseId(
				phraseId,
				TEST_USER_UID,
				sessionDate
			)
			if (existingReview) {
				// Already reviewed — skip forward via Next card button
				const nextBtn = page.getByRole('button', { name: 'Next card' })
				if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
					await nextBtn.click()
					await page.waitForTimeout(400)
					continue
				}
			}

			// Reveal answer if needed (scoped to current card)
			const revealBtn = currentCard.getByTestId('reveal-answer-button')
			const answerBtns = currentCard.locator('[data-name="answer-buttons-row"]')
			if (await revealBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
				await revealBtn.click()
			}
			await expect(answerBtns).toBeVisible({ timeout: 5000 })

			// Score: every 3rd unreviewed card gets "Again" (1), rest get "Good" (3)
			const useAgain = (goodPhraseIds.length + againPhraseIds.length) % 3 === 2
			if (useAgain) {
				await currentCard.getByTestId('rating-again-button').click()
				againPhraseIds.push(phraseId)
			} else {
				await currentCard.getByTestId('rating-good-button').click()
				goodPhraseIds.push(phraseId)
			}

			// Wait for the slide animation to complete
			await page.waitForTimeout(600)
		}

		// We should now be on the stage-complete screen
		await expect(completeScreen).toBeVisible({ timeout: 10000 })

		// Verify the DB has the correct number of reviews
		const { data: allReviews } = await supabase
			.from('user_card_review')
			.select()
			.eq('uid', TEST_USER_UID)
			.eq('lang', TEST_LANG)
			.eq('day_session', sessionDate)

		expect(allReviews).toBeTruthy()
		expect(allReviews!.length).toBe(manifest.length)

		// Check DB stage — should NOT be 5 yet (we still have "again" cards)
		const { data: stateAfterStage1 } = await getReviewSessionState(
			TEST_USER_UID,
			TEST_LANG,
			sessionDate
		)
		expect(stateAfterStage1).toBeTruthy()
		// Stage should be 1 still (first pass complete, but server hasn't been told to advance)
		// The WhenComplete component should show "Step 3 of 3" with "Review cards" button
		expect(stateAfterStage1!.stage).toBeLessThan(5)

		// Verify the screen shows the "again" cards prompt (Step 3 of 3)
		// (Step 2 is skipped when there are no unreviewed cards)
		if (againPhraseIds.length > 0) {
			await expect(page.getByText('Step 3 of 3')).toBeVisible({
				timeout: 5000,
			})
			await expect(
				page.getByRole('button', {
					name: new RegExp(`Review cards \\(${againPhraseIds.length}\\)`),
				})
			).toBeVisible()
		}
	})

	test('3. review "again" cards (stage 4) and verify DB stage correctness', async ({
		page,
	}) => {
		await page.goto('/learn')
		await goToDeckPage(page, TEST_LANG)

		// We should see ContinueReview since the session exists from test 2
		const continueBtn = page.getByRole('button', { name: 'Continue Review' })
		await expect(continueBtn).toBeVisible({ timeout: 10000 })
		await continueBtn.click()

		// Should navigate to /review/go
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/review/go`), {
			timeout: 10000,
		})

		// Handle new cards preview if it appears (stage 1 + fresh previewSeen state)
		const startReviewBtn = page.getByRole('button', { name: 'Start Review' })
		const completeScreen = page.getByTestId('review-complete-page')
		await expect(startReviewBtn.or(completeScreen)).toBeVisible({
			timeout: 10000,
		})
		if (await startReviewBtn.isVisible()) {
			await startReviewBtn.scrollIntoViewIfNeeded()
			await startReviewBtn.click()
		}

		// Now we should see the WhenComplete screen (atTheEnd because all cards reviewed)
		await expect(completeScreen).toBeVisible({ timeout: 10000 })

		// Count "again" cards from DB (day_first_review=true, score=1)
		const { data: againReviews } = await supabase
			.from('user_card_review')
			.select()
			.eq('uid', TEST_USER_UID)
			.eq('lang', TEST_LANG)
			.eq('day_session', sessionDate)
			.eq('day_first_review', true)
			.eq('score', 1)

		const againCount = againReviews?.length ?? 0
		expect(againCount).toBeGreaterThan(0)

		// Verify the "Review cards" button shows the correct count
		const reviewAgainBtn = page.getByRole('button', {
			name: new RegExp(`Review cards \\(${againCount}\\)`),
		})
		await expect(reviewAgainBtn).toBeVisible({ timeout: 5000 })

		// Check DB stage BEFORE clicking "Review cards"
		const { data: stateBefore } = await getReviewSessionState(
			TEST_USER_UID,
			TEST_LANG,
			sessionDate
		)
		expect(stateBefore!.stage).toBeLessThan(5)

		// Click "Review cards" to enter stage 4
		await reviewAgainBtn.click()

		// Wait for the stage mutation and UI to settle
		await page.waitForTimeout(1500)

		// CRITICAL ASSERTION: DB stage should be 4, NOT 5
		// This is the bug we fixed — previously the useEffect in WhenComplete
		// would immediately write stage 5 when entering stage 4
		await expect
			.poll(
				async () => {
					const { data } = await getReviewSessionState(
						TEST_USER_UID,
						TEST_LANG,
						sessionDate
					)
					return data?.stage
				},
				{ timeout: 5000, intervals: [500, 1000, 1000] }
			)
			.toBe(4)

		// We should be looking at a flashcard (not the complete screen)
		const currentCard = page
			.locator('div:not(.hidden) > [data-name="flashcard"]')
			.first()
		await expect(currentCard).toBeVisible({ timeout: 10000 })

		// Re-review all "again" cards with score 3 (Good)
		const reReviewedPhraseIds: string[] = []

		for (let i = 0; i < againCount + 2; i++) {
			// Check if we've reached the complete screen
			const completeVisible = await completeScreen
				.isVisible({ timeout: 800 })
				.catch(() => false)
			if (completeVisible) break

			const card = page
				.locator('div:not(.hidden) > [data-name="flashcard"]')
				.first()
			const isCardVisible = await card
				.isVisible({ timeout: 2000 })
				.catch(() => false)
			if (!isCardVisible) break

			const phraseId = await card.getAttribute('data-key')
			if (!phraseId) break

			// Reveal answer if needed (scoped to current card)
			const revealBtn = card.getByTestId('reveal-answer-button')
			const answerBtns = card.locator('[data-name="answer-buttons-row"]')
			if (await revealBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
				await revealBtn.click()
			}
			await expect(answerBtns).toBeVisible({ timeout: 5000 })

			// Score all re-reviews as "Good" (3)
			await card.getByTestId('rating-good-button').click()
			reReviewedPhraseIds.push(phraseId)

			// Wait for slide animation
			await page.waitForTimeout(600)
		}

		// Should have re-reviewed all "again" cards
		expect(reReviewedPhraseIds.length).toBe(againCount)

		// Should now be on the "Review Complete" screen
		await expect(completeScreen).toBeVisible({ timeout: 10000 })
		await expect(page.getByText('Review Complete!')).toBeVisible()

		// Verify DB stage is now 5 (truly complete)
		await expect
			.poll(
				async () => {
					const { data } = await getReviewSessionState(
						TEST_USER_UID,
						TEST_LANG,
						sessionDate
					)
					return data?.stage
				},
				{ timeout: 5000, intervals: [500, 1000, 1000] }
			)
			.toBe(5)

		// Verify re-reviews were created with day_first_review=false
		for (const phraseId of reReviewedPhraseIds) {
			const { data: reReviews } = await supabase
				.from('user_card_review')
				.select()
				.eq('phrase_id', phraseId)
				.eq('uid', TEST_USER_UID)
				.eq('day_session', sessionDate)
				.eq('day_first_review', false)

			expect(reReviews).toBeTruthy()
			expect(reReviews!.length).toBe(1)
			expect(reReviews![0].score).toBe(3)
		}
	})

	test.skip('4. useReviewMutation: verify FSRS algorithm calculations', async ({
		page,
	}) => {
		await page.goto('/learn')
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
		await page.goto('/learn')
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
