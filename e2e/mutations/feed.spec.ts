import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_USER_UID } from '../helpers/auth-helpers'
import {
	createRequest,
	createPlaylist,
	createPhrase,
	deleteRequest,
	deletePlaylist,
	deletePhrase,
	supabase,
} from '../helpers/db-helpers'

test.describe('Unified Feed', () => {
	test('displays requests, playlists, and phrases in chronological order', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		const lang = 'hin'
		const nonce = Math.random().toString(36).substring(7)
		const requestText = `Chron Order Request ${nonce}`
		const playlistText = `Chron Order Playlist ${nonce}`
		const phraseText = `Chron Order Phrase ${nonce}`
		const translationText = `Chron Order Translation Text ${nonce}`
		const translationLang = 'eng'

		// 1. Setup Data: Request -> Playlist -> Phrase
		const request = await createRequest({
			lang,
			prompt: requestText,
		})
		const playlist = await createPlaylist({
			lang,
			title: playlistText,
		})
		const { phrase } = await createPhrase({
			lang,
			text: phraseText,
			translationText,
			translationLang,
		})

		try {
			// Navigate to feed via UI
			await page.goto('/learn')
			await page
				.getByTestId(`deck-card-${lang}`)
				.getByTestId(`deck-card-link-${lang}`)
				.click()

			await expect(page.getByText(requestText).first()).toBeVisible()
			await expect(page.getByText(playlistText).first()).toBeVisible()
			await expect(page.getByText(phraseText).first()).toBeVisible()

			// Order: Phrase (top), Playlist, Request (bottom)
			const phraseLoc = page.getByText(phraseText)
			const playlistLoc = page.getByText(playlistText)
			const requestLoc = page.getByText(requestText)

			const phraseBox = await phraseLoc.boundingBox()
			const playlistBox = await playlistLoc.boundingBox()
			const requestBox = await requestLoc.boundingBox()

			expect(phraseBox?.y).toBeLessThan(playlistBox!.y)
			expect(playlistBox?.y).toBeLessThan(requestBox!.y)
		} finally {
			if (phrase) await deletePhrase(phrase.id)
			if (playlist) await deletePlaylist(playlist.id)
			if (request) await deleteRequest(request.id)
		}
	})

	test('displays phrase provenance correctly (linked to request)', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		const nonce = Math.random().toString(36).substring(7)
		const lang = 'hin'
		const phraseText = `Provenance Phrase ${nonce}`
		const translationText = `Provenance Translation Text ${nonce}`
		const translationLang = 'eng'
		const prompt = `Provenance Request ${nonce}`

		// 1. Create Request
		const request = await createRequest({
			lang,
			prompt,
		})

		// 2. Create Phrase and link it to the request via comment (simulated)
		const { phrase } = await createPhrase({
			lang,
			text: phraseText,
			translationText,
			translationLang,
		})

		// Create a comment and link
		const { data: comment } = await supabase
			.from('request_comment')
			.insert({
				request_id: request.id,
				uid: TEST_USER_UID,
				content: 'Linked phrase here',
			})
			.select()
			.single()

		if (comment) {
			await supabase.from('comment_phrase_link').insert({
				request_id: request.id,
				comment_id: comment.id,
				phrase_id: phrase.id,
				uid: TEST_USER_UID,
			})
		}

		try {
			// Navigate to feed via UI (start from home/learn)
			await page.goto('/learn')
			await page
				.getByTestId(`deck-card-${lang}`)
				.getByTestId(`deck-card-link-${lang}`)
				.click()

			// Find the phrase item using the actual text from the database
			await expect(page.getByText(phraseText).first()).toBeVisible()

			// Check for provenance text in pieces
			await expect(page.getByText('added a phrase').first()).toBeVisible()
			await expect(
				page.getByText('In response to request').first()
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: 'discussion' }).first()
			).toBeVisible()
			await expect(page.getByText(request.prompt).first()).toBeVisible()
		} finally {
			// Cleanup
			await deletePhrase(phrase.id)
			await deleteRequest(request.id)
			if (comment) {
				await supabase.from('request_comment').delete().eq('id', comment.id)
			}
		}
	})

	test('supports infinite scrolling', async ({ page }) => {
		await loginAsTestUser(page)
		const lang = 'hin'

		// 1. Create many requests to ensure we have enough for pagination
		// Default page size is likely 20 or similar.
		const count = 25
		const requests = []
		for (let i = 0; i < count; i++) {
			requests.push(
				createRequest({
					lang,
					prompt: `Pagination Request ${i}`,
				})
			)
		}
		const createdRequests = await Promise.all(requests)

		try {
			// Navigate to feed via UI
			await page.goto('/learn')
			await page
				.getByTestId(`deck-card-${lang}`)
				.getByTestId(`deck-card-link-${lang}`)
				.click()

			// Verify first page is visible
			await expect(
				page.getByText(createdRequests[count - 1].prompt).first()
			).toBeVisible()

			// Scroll to bottom
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

			// Load More button might be there if not automatic
			const loadMore = page.getByRole('button', { name: /load more/i })
			if (await loadMore.isVisible()) {
				await loadMore.click()
			}

			// Verify items from second page are visible
			await expect(
				page.getByText(createdRequests[0].prompt).first()
			).toBeVisible()
		} finally {
			for (const r of createdRequests) {
				deleteRequest(r.id)
			}
		}
	})
	test('updates feed immediately after creating a request through UI', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		const lang = 'hin'
		const nonce = Math.random().toString(36).substring(7)
		const promptText = `UI Sync Request ${nonce}`

		// 1. Go to Feed initially
		await expect(page).toHaveURL(`/learn`)
		await page
			.getByTestId(`deck-card-${lang}`)
			.getByTestId(`deck-card-link-${lang}`)
			.click()
		await expect(page.getByText('Activity feed for Hindi')).toBeVisible()

		// 2. Navigate to New Request page via UI (preserving SPA state)
		await page.getByRole('link', { name: 'Request a Phrase' }).click()
		await expect(page).toHaveURL(new RegExp(`/learn/${lang}/requests/new`))

		// 3. Fill and submit
		await page.getByTestId('request-prompt-input').fill(promptText)
		await page.getByTestId('post-request-button').click()

		// 4. Wait for success and redirect to the request detail page
		await expect(page).toHaveURL(new RegExp(`/learn/${lang}/requests/`))

		// 5. Navigate back to feed using UI link (preserving SPA state)
		await page.getByTestId('sidebar-link-feed').click()

		// 6. Verify the new request is visible immediately (due to invalidation & SPA state)
		await expect(page.getByText(promptText).first()).toBeVisible()

		// Cleanup
		const { data: request } = await supabase
			.from('phrase_request')
			.select('id')
			.eq('prompt', promptText)
			.single()
		if (request) await deleteRequest(request.id)
	})
})
