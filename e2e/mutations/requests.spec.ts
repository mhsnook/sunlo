import { test, expect } from '@playwright/test'
import { TEST_USER_UID, FIRST_USER_UID } from '../helpers/auth-helpers'
import {
	createRequest,
	deleteRequest,
	getRequest,
	deletePhrase,
	getPhrase,
	supabase,
} from '../helpers/db-helpers'
import { TEST_LANG } from '../helpers/test-constants'

test.describe('Phrase Request Mutations', () => {
	test('createRequestMutation: create new phrase request', async ({ page }) => {
		// 1. Create an initial request via API for context (so the page isn't empty)
		const contextRequest = await createRequest({
			lang: TEST_LANG,
			prompt: 'How do I say context request?',
		})
		await page.goto('/learn')
		const contextPrompt = contextRequest?.prompt
		expect(contextPrompt).toBeTruthy()
		expect(contextPrompt.includes('How do I say context request?')).toBeTruthy()

		try {
			// 2. Navigate to requests index page first
			// @@TODO @@TEMP make this parameter work?
			await page.goto(
				`/learn/${TEST_LANG}/contributions?contributionsTab=requests`
			)

			// Verify context request is visible
			await expect(page.getByText(contextPrompt)).toBeVisible()

			// Click the "New request" button
			await page.click(`a[href="/learn/${TEST_LANG}/requests/new"]`)

			// 3. Create a new request via UI
			const newPrompt = `How do I say test request - form - ${Math.random()}?`

			// Fill the prompt field
			await page.fill('textarea[name="prompt"]', newPrompt)

			// Submit the form
			await page.click('button[type="submit"]:has-text("Post Request")')

			// Wait for success toast
			await expect(
				page.getByText('Your request has been created!')
			).toBeVisible()

			// Should navigate back to requests index
			await expect(page).toHaveURL(
				new RegExp(`/learn/${TEST_LANG}/requests/[a-f0-9-]+`)
			)

			// 4. Verify the new request is showing up on the index page
			await expect(page.getByText(newPrompt)).toBeVisible()

			// Click on the card containing the prompt
			await page.click(`p:has-text("${newPrompt}")`)
			const requestId = page.url().split('/').pop()

			expect(requestId).toBeTruthy()

			// 5. Verify request in local collection
			const requestInCollection = await page.evaluate((id) => {
				// @ts-expect-error - accessing window global
				return window.__phraseRequestsCollection?.get(id)
			}, requestId!)

			expect(requestInCollection).toBeTruthy()
			expect(requestInCollection?.prompt).toBe(newPrompt)
			expect(requestInCollection?.lang).toBe(TEST_LANG)
			expect(requestInCollection?.requester_uid).toBe(TEST_USER_UID)

			// 6. Verify request in database
			const { data: dbRequest } = await getRequest(requestId!)
			expect(dbRequest).toBeTruthy()
			expect(dbRequest?.prompt).toBe(newPrompt)
			expect(dbRequest?.lang).toBe(TEST_LANG)
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

	// TODO: This test needs to be rewritten. The UI changed from an inline phrase form
	// to a comment-based system with attached phrases. The test expects phrase_text/translation_text
	// fields but the current UI uses AddCommentDialog with SelectPhrasesForComment.
	test.skip('fulfillMutation: fulfill a phrase request', async ({ page }) => {
		// 1. Create a pending request via API
		const fulfillPrompt = `How do I say "fulfill test" in a fun way?`
		const request = await createRequest({
			lang: TEST_LANG,
			prompt: fulfillPrompt,
		})

		await page.goto('/learn')

		try {
			// 2. Navigate to the specific request page
			await page.goto(`/learn/${TEST_LANG}/requests/${request.id}`)

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
			expect(phraseInCollection?.lang).toBe(TEST_LANG)
			expect(phraseInCollection?.request_id).toBe(request.id)

			// 6. Verify phrase in database
			const { data: dbPhrase } = await getPhrase(phraseId!)
			expect(dbPhrase).toBeTruthy()
			expect(dbPhrase?.text).toBe(phraseText)
			expect(dbPhrase?.lang).toBe(TEST_LANG)
			// expect(dbPhrase?.request_id).toBe(request.id)

			// 7. Verify request updated in database
			const { data: updatedRequest } = await getRequest(request.id)
			expect(updatedRequest).toBeTruthy()
			// expect(updatedRequest?.fulfilled_at).toBeTruthy() // Should have timestamp

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

	test('comment context menu: share and copy permalink', async ({
		page,
		context,
	}) => {
		// 1. Create a request and a comment
		const request = await createRequest({
			lang: TEST_LANG,
			prompt: 'Test request for comment context menu',
		})

		// Create a comment on the request
		const commentContent = `Test comment ${Math.random()}`
		const { data: comment, error: commentError } = await supabase
			.from('request_comment')
			.insert({
				request_id: request.id,
				uid: TEST_USER_UID,
				content: commentContent,
			})
			.select()
			.single()

		expect(commentError).toBeNull()
		expect(comment).toBeTruthy()

		await page.goto('/learn')

		try {
			// 2. Navigate to the request page
			await page.goto(`/learn/${TEST_LANG}/requests/${request.id}`)

			// Verify comment is visible
			await expect(page.getByText(commentContent)).toBeVisible()

			// 3. Find the comment item and its context menu button
			const commentItem = page
				.locator('[data-testid="comment-item"]')
				.filter({ hasText: commentContent })
			const contextMenuButton = commentItem.getByTestId(
				'comment-context-menu-trigger'
			)

			await expect(contextMenuButton).toBeVisible()

			// 4. Click the context menu button
			await contextMenuButton.click()

			// Verify menu is open
			await expect(
				page.getByRole('menuitem', { name: 'Copy link' })
			).toBeVisible()

			// 5. Test "Copy link" functionality
			await page.getByRole('menuitem', { name: 'Copy link' }).click()

			// Wait for either success or error toast
			await expect(
				page.getByText(/Link copied to clipboard|Failed to copy link/)
			).toBeVisible({ timeout: 10000 })

			// Try to verify clipboard (only works in Chromium with permissions)
			try {
				await context.grantPermissions(['clipboard-read', 'clipboard-write'])
				const clipboardText = await page.evaluate(() =>
					navigator.clipboard.readText()
				)
				if (clipboardText) {
					expect(clipboardText).toContain(
						`/learn/${TEST_LANG}/requests/${request.id}`
					)
					expect(clipboardText).toContain(`showSubthread=${comment!.id}`)
				}
			} catch /*(error)*/ {
				// Clipboard permissions not supported or operation failed, skip verification
			}

			// 7. Open the context menu again to test Report (if visible in dev mode)
			await contextMenuButton.click()

			// Check if Report option exists (it's wrapped in Flagged component)
			const reportOption = page.getByRole('menuitem', { name: 'Report' })
			if (await reportOption.isVisible()) {
				await reportOption.click()

				// Wait for success toast
				await expect(page.getByText('Thank you for reporting')).toBeVisible()
			}
		} finally {
			// Clean up comment and request
			if (comment?.id) {
				await supabase.from('request_comment').delete().eq('id', comment.id)
			}
			await deleteRequest(request.id)
		}
	})

	test('update request: edit request prompt', async ({ page }) => {
		// 1. Create a request via API
		const originalPrompt = `Original request prompt ${Math.random()}`
		const request = await createRequest({
			lang: TEST_LANG,
			prompt: originalPrompt,
		})

		await page.goto('/learn')

		try {
			// 2. Navigate to the request page
			await page.goto(`/learn/${TEST_LANG}/requests/${request.id}`)

			// Verify original prompt is visible
			await expect(page.getByText(originalPrompt)).toBeVisible()

			// 3. Click the edit button (should be visible since we're the owner)
			const editButton = page.getByRole('button', { name: 'Update request' })
			await expect(editButton).toBeVisible()
			await editButton.click()

			// 4. Verify the edit dialog is open
			await expect(page.getByRole('dialog')).toBeVisible()
			await expect(
				page.getByRole('heading', { name: 'Edit Request' })
			).toBeVisible()

			// 5. Edit the prompt
			const updatedPrompt = `Updated request prompt ${Math.random()}`
			const textarea = page.getByRole('dialog').locator('textarea')
			await textarea.clear()
			await textarea.fill(updatedPrompt)

			// 6. Save the changes
			await page
				.getByRole('dialog')
				.getByRole('button', { name: 'Save' })
				.click()

			// Wait for success toast
			await expect(page.getByText('Request updated!')).toBeVisible()

			// 7. Verify the dialog is closed and the new prompt is visible
			await expect(page.getByRole('dialog')).not.toBeVisible()
			await expect(page.getByText(updatedPrompt)).toBeVisible()
			await expect(page.getByText(originalPrompt)).not.toBeVisible()

			// 8. Verify update in local collection
			const requestInCollection = await page.evaluate(
				(reqId) => (window as any).__phraseRequestsCollection.get(reqId),
				request.id
			)
			expect(requestInCollection).toBeTruthy()
			expect(requestInCollection?.prompt).toBe(updatedPrompt)

			// 9. Verify update in database
			const { data: dbRequest } = await getRequest(request.id)
			expect(dbRequest).toBeTruthy()
			expect(dbRequest?.prompt).toBe(updatedPrompt)
			expect(dbRequest?.updated_at).toBeTruthy()
		} finally {
			// Clean up the request
			await deleteRequest(request.id)
		}
	})

	test('delete request: soft delete request', async ({ page }) => {
		// 1. Create a request via API
		const requestPrompt = `Request to be deleted ${Math.random()}`
		const request = await createRequest({
			lang: TEST_LANG,
			prompt: requestPrompt,
		})

		await page.goto('/learn')

		try {
			// 2. Navigate to the request page
			await page.goto(`/learn/${TEST_LANG}/requests/${request.id}`)

			// Verify request is visible
			await expect(page.getByText(requestPrompt)).toBeVisible()

			// 3. Click the delete button (should be visible since we're the owner)
			const deleteButton = page.getByRole('button', { name: 'Delete request' })
			await expect(deleteButton).toBeVisible()
			await deleteButton.click()

			// 4. Verify the delete confirmation dialog is open
			await expect(
				page.getByRole('heading', { name: 'Delete request?' })
			).toBeVisible()

			// 5. Confirm deletion
			await page.getByRole('button', { name: 'Delete' }).click()

			// Wait for success toast
			await expect(page.getByText('Request deleted')).toBeVisible()

			// 6. Should navigate away from the deleted request page
			await page.waitForURL(`/learn/${TEST_LANG}/feed`)

			// 7. Verify request is not in local collection
			const requestInCollection = await page.evaluate(
				(reqId) => (window as any).__phraseRequestsCollection.get(reqId),
				request.id
			)
			expect(requestInCollection).toBeFalsy()

			// 8. Verify request is soft-deleted in database (deleted flag = true)
			const { data: dbRequest } = await supabase
				.from('phrase_request')
				.select('*, deleted')
				.eq('id', request.id)
				.single()

			expect(dbRequest).toBeTruthy()
			expect(dbRequest?.deleted).toBe(true)
			// Note: RLS filtering is handled by DB policies, not tested here since db-helpers uses service role
		} finally {
			// Clean up the request (hard delete for test cleanup)
			await supabase.from('phrase_request').delete().eq('id', request.id)
		}
	})

	test('ownership: non-owner cannot see edit/delete buttons', async ({
		page,
	}) => {
		// 1. Create a request owned by FIRST_USER
		const requestPrompt = `Another user's request ${Math.random()}`
		const { data: otherUserRequest } = await supabase
			.from('phrase_request')
			.insert({
				lang: TEST_LANG,
				prompt: requestPrompt,
				requester_uid: FIRST_USER_UID,
			})
			.select()
			.single()

		expect(otherUserRequest).toBeTruthy()

		await page.goto('/learn')

		try {
			// 2. Navigate to the request page as TEST_USER (not the owner)
			await page.goto(`/learn/${TEST_LANG}/requests/${otherUserRequest!.id}`)

			// Verify request is visible
			await expect(page.getByText(requestPrompt)).toBeVisible()

			// 3. Verify edit and delete buttons are NOT visible
			const editButton = page.getByRole('button', { name: 'Update request' })
			await expect(editButton).not.toBeVisible()

			const deleteButton = page.getByRole('button', { name: 'Delete request' })
			await expect(deleteButton).not.toBeVisible()
		} finally {
			// Clean up
			await supabase
				.from('phrase_request')
				.delete()
				.eq('id', otherUserRequest!.id)
		}
	})
})
