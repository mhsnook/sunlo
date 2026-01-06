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
			await page.goto(`/learn/${lang}/feed`)

			await expect(page.getByText(requestText)).toBeVisible()
			await expect(page.getByText(playlistText)).toBeVisible()
			await expect(page.getByText(phraseText)).toBeVisible()

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
			await page.goto(`/learn/${lang}/feed`)

			// Find the phrase item
			await expect(page.getByText(`Provenance Phrase ${nonce}`)).toBeVisible()

			// Check for provenance text in pieces (since it's in separate spans)
			await expect(page.getByText('added a phrase')).toBeVisible()
			await expect(page.getByText('In response to request')).toBeVisible()
			await expect(page.getByRole('link', { name: 'discussion' })).toBeVisible()
			await expect(page.getByText(prompt)).toBeVisible()
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
			await page.goto(`/learn/${lang}/feed`)

			// Verify first page is visible
			await expect(page.getByText('Pagination Request 24')).toBeVisible()

			// Scroll to bottom
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

			// Load More button might be there if not automatic
			const loadMore = page.getByRole('button', { name: /load more/i })
			if (await loadMore.isVisible()) {
				await loadMore.click()
			}

			// Verify items from second page are visible
			await expect(page.getByText('Pagination Request 0')).toBeVisible()
		} finally {
			for (const r of createdRequests) {
				await deleteRequest(r.id)
			}
		}
	})
})
