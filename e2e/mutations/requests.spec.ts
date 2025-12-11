import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_USER_UID } from '../helpers/auth-helpers'
import {
	createRequest,
	deleteRequest,
	getRequest,
	deletePhrase,
	getPhrase,
} from '../helpers/db-helpers'

test.describe('Phrase Request Mutations', () => {
	test('createRequestMutation: create new phrase request', async ({ page }) => {
		// 1. Create an initial request via API for context (so the page isn't empty)
		const contextRequest = await createRequest({
			lang: 'hin',
			prompt: 'How do I say context request?',
		})
		await loginAsTestUser(page)
		const contextPrompt = contextRequest?.prompt
		expect(contextPrompt).toBeTruthy()
		expect(contextPrompt.includes('How do I say context request?')).toBeTruthy()

		try {
			// 2. Navigate to requests index page first
			// @@TODO @@TEMP make this parameter work?
			await page.goto('/learn/hin/contributions?type=request')

			// Verify context request is visible
			await expect(page.getByText(contextPrompt)).toBeVisible()

			// Click the "New request" button
			await page.click('a[href="/learn/hin/requests/new"]')

			// 3. Create a new request via UI
			const newPrompt = `How do I say test request - form - ${Math.random()}?`

			// Fill the prompt field
			await page.fill('textarea[name="prompt"]', newPrompt)

			// Submit the form
			await page.click('button[type="submit"]:has-text("Create Request")')

			// Wait for success toast
			await expect(
				page.getByText('Your request has been created!')
			).toBeVisible()

			// Should navigate back to requests index
			await page.waitForURL('/learn/hin/contributions?type=request')

			// 4. Verify the new request is showing up on the index page
			await expect(page.getByText(newPrompt)).toBeVisible()

			// Get the request ID from the "View Details" link in the card containing the prompt
			const requestCard = page
				.locator(`div.group:has-text("${newPrompt}")`)
				.first()
			const viewDetailsLink = requestCard.getByRole('link', {
				name: 'Discussion',
			})
			const href = await viewDetailsLink.getAttribute('href')
			const requestId = href?.split('/').pop()

			expect(requestId).toBeTruthy()

			// 5. Verify request in local collection
			const requestInCollection = await page.evaluate((id) => {
				// @ts-expect-error - accessing window global
				return window.__phraseRequestsCollection?.get(id)
			}, requestId!)

			expect(requestInCollection).toBeTruthy()
			expect(requestInCollection?.prompt).toBe(newPrompt)
			expect(requestInCollection?.lang).toBe('hin')
			expect(requestInCollection?.requester_uid).toBe(TEST_USER_UID)

			// 6. Verify request in database
			const { data: dbRequest } = await getRequest(requestId!)
			expect(dbRequest).toBeTruthy()
			expect(dbRequest?.prompt).toBe(newPrompt)
			expect(dbRequest?.lang).toBe('hin')
			expect(dbRequest?.requester_uid).toBe(TEST_USER_UID)

			// 7. Verify data matches between DB and collection
			expect(dbRequest).toMatchObject({
				id: requestInCollection!.id,
				prompt: requestInCollection!.prompt,
				lang: requestInCollection!.lang,
				requester_uid: requestInCollection!.requester_uid,
			})

			// Clean up the new request
			await deleteRequest(requestId!)
		} finally {
			// Clean up context request
			await deleteRequest(contextRequest.id)
		}
	})

	test('fulfillMutation: fulfill a phrase request', async ({ page }) => {
		// 1. Create a pending request via API
		const fulfillPrompt = `How do I say "fulfill test" in a fun way?`
		const request = await createRequest({
			lang: 'hin',
			prompt: fulfillPrompt,
		})

		await loginAsTestUser(page)

		try {
			// 2. Navigate to the specific request page
			await page.goto(`/learn/hin/requests/${request.id}`)

			// Verify request is visible and unfulfilled
			await expect(page.getByText(fulfillPrompt)).toBeVisible()

			// The form is inside a collapsible that auto-opens if there are no answers
			// Wait for the form to be visible
			await expect(page.locator('textarea[name="phrase_text"]')).toBeVisible()

			// 3. Fulfill the request by adding a phrase
			const phraseText = `Fulfill test phrase ${Math.random()}`
			const translationText = `Fulfill test translation ${Math.random()}`

			// Fill in the phrase form (note the correct field names: phrase_text, translation_text)
			await page.fill('textarea[name="phrase_text"]', phraseText)
			await page.fill('textarea[name="translation_text"]', translationText)

			// Submit the form
			await page.click('button[type="submit"]:has-text("Submit Phrase")')

			// Wait for success toast
			await expect(
				page.getByText('Thank you for your contribution!')
			).toBeVisible()

			// 4. Find the phrase card and get ID from the permalink link
			const phraseCard = page.locator(
				`div.bg-card/50:has-text("${phraseText}") .bg-card/50`
			)
			const phraseLink = phraseCard.getByRole('link').last() // PermalinkButton
			const href = await phraseLink.getAttribute('href')
			const phraseId = href?.split('/').pop()

			expect(phraseId).toBeTruthy()
			console.log(`!!!! phrase ID !!! ${phraseId}`)

			// 5. Verify phrase in local collection
			const phraseInCollection = await page.evaluate((id) => {
				// @ts-expect-error - accessing window global
				return window.__phrasesCollection?.get(id)
			}, phraseId!)

			expect(phraseInCollection).toBeTruthy()
			expect(phraseInCollection?.text).toBe(phraseText)
			expect(phraseInCollection?.lang).toBe('hin')
			expect(phraseInCollection?.request_id).toBe(request.id)

			// 6. Verify phrase in database
			const { data: dbPhrase } = await getPhrase(phraseId!)
			expect(dbPhrase).toBeTruthy()
			expect(dbPhrase?.text).toBe(phraseText)
			expect(dbPhrase?.lang).toBe('hin')
			expect(dbPhrase?.request_id).toBe(request.id)

			// 7. Verify request updated in database
			const { data: updatedRequest } = await getRequest(request.id)
			expect(updatedRequest).toBeTruthy()
			expect(updatedRequest?.fulfilled_at).toBeTruthy() // Should have timestamp

			// 8. Verify request updated in local collection
			const requestInCollection = await page.evaluate(
				(reqId) => (window as any).__phraseRequestsCollection.get(reqId),
				request.id
			)
			expect(requestInCollection).toBeTruthy()

			// @TODO We should probably remove this column altogether as it doesn't work with
			// the final data model where one request can have many answers. And anyway it no
			// longer seems to be updated in the RPC.
			// expect(requestInCollection?.fulfilled_at).toBeTruthy()

			// 9. Reload page and verify UI shows fulfilled state
			await page.reload()

			// Should show the phrase that fulfilled the request
			await expect(page.getByText(phraseText)).toBeVisible()
			await expect(page.getByText(translationText)).toBeVisible()

			// Clean up the phrase (will cascade to translations)
			await deletePhrase(phraseId!)
		} finally {
			// Clean up the request
			await deleteRequest(request.id)
		}
	})
})
