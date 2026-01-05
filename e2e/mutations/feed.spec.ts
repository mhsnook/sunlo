import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'
import {
	createRequest,
	createPlaylist,
	createPhrase,
	deleteRequest,
	deletePlaylist,
	deletePhrase,
} from '../helpers/db-helpers'

test.describe('Unified Feed', () => {
	test('displays requests, playlists, and phrases in chronological order', async ({
		page,
	}) => {
		// 1. Setup Data
		await loginAsTestUser(page)
		const nonce = Math.random().toString(36).substring(7)

		// Create items slightly apart in time (though current helper creates immediately)
		// We rely on the order they are created.

		// Create Request
		const request = await createRequest({
			lang: 'hin',
			prompt: `Feed Request Test ${nonce}`,
		})

		// Create Playlist
		const playlist = await createPlaylist({
			lang: 'hin',
			title: `Feed Playlist Test ${nonce}`,
			description: 'Testing feed integration',
		})

		// Create Phrase
		const { phrase } = await createPhrase({
			lang: 'hin',
			text: `Feed Phrase Test ${nonce}`,
			translationText: 'Testing feed phrase',
		})

		try {
			// 2. Go to Feed
			await page.goto('/learn/hin/feed')

			// 3. Verify Items Visible
			// Request
			await expect(page.getByText(`Feed Request Test ${nonce}`)).toBeVisible()

			// Playlist
			await expect(page.getByText(`Feed Playlist Test ${nonce}`)).toBeVisible()
			await expect(page.getByText('Testing feed integration')).toBeVisible()

			// Phrase (TinyCard shows text)
			await expect(page.getByText(`Feed Phrase Test ${nonce}`)).toBeVisible()

			// 4. Verify Order (Newest first)
			// Since we created Request -> Playlist -> Phrase,
			// Phrase should be top (newest), then Playlist, then Request.
			// We can check the order of elements in the DOM.

			const requestLoc = page.locator(`:text("Feed Request Test ${nonce}")`)
			const playlistLoc = page.locator(`:text("Feed Playlist Test ${nonce}")`)
			const phraseLoc = page.locator(`:text("Feed Phrase Test ${nonce}")`)

			// Get bounding boxes to compare Y position
			const phraseBox = await phraseLoc.boundingBox()
			const playlistBox = await playlistLoc.boundingBox()
			const requestBox = await requestLoc.boundingBox()

			expect(phraseBox?.y).toBeLessThan(playlistBox!.y)
			expect(playlistBox?.y).toBeLessThan(requestBox!.y)
		} finally {
			// Cleanup
			if (phrase) await deletePhrase(phrase.id)
			if (playlist) await deletePlaylist(playlist.id)
			if (request) await deleteRequest(request.id)
		}
	})
})
