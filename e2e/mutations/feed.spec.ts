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

			// 6. Verify the phrase is NOT visible as a standalone activity (the "A new Phrase" text)
			// It should be visible elsewhere (like in the request card) but not as its own activity item.
			await expect(
				page.locator('div', { hasText: 'A new Phrase' }).getByText(phraseText)
			).not.toBeVisible()

			// Check that the request item is visible and shows the answer
			await expect(page.getByText(prompt).first()).toBeVisible()
			await expect(page.getByText('1 answer').first()).toBeVisible()
		} finally {
			// Cleanup
			await deletePhrase(phrase.id)
			await deleteRequest(request.id)
			if (comment) {
				await supabase.from('request_comment').delete().eq('id', comment.id)
			}
		}
	})
	test('folds playlist phrases into the playlist activity', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		const lang = 'hin'
		const nonce = Math.random().toString(36).substring(7)
		const playlistTitle = `Folding Playlist ${nonce}`
		const phrase1Text = `Folded Phrase 1 ${nonce}`
		const phrase2Text = `Folded Phrase 2 ${nonce}`

		// 1. Create a playlist
		const playlist = await createPlaylist({
			lang,
			title: playlistTitle,
		})

		// 2. Create phrases and link them to the playlist
		const { phrase: phrase1 } = await createPhrase({
			lang,
			text: phrase1Text,
			translationText: 'Trans 1',
			translationLang: 'eng',
		})
		const { phrase: phrase2 } = await createPhrase({
			lang,
			text: phrase2Text,
			translationText: 'Trans 2',
			translationLang: 'eng',
		})

		await supabase.from('playlist_phrase_link').insert([
			{ playlist_id: playlist.id, phrase_id: phrase1.id, uid: TEST_USER_UID },
			{ playlist_id: playlist.id, phrase_id: phrase2.id, uid: TEST_USER_UID },
		])

		try {
			await page.goto('/learn')
			await page
				.getByTestId(`deck-card-${lang}`)
				.getByTestId(`deck-card-link-${lang}`)
				.click()

			// 3. Verify the playlist is visible, with "2 phrases" badge
			await expect(page.getByText(playlistTitle).first()).toBeVisible()
			await expect(page.getByText('created a playlist').first()).toBeVisible()
			await expect(page.getByText('2 phrases').first()).toBeVisible()

			// 4. Verify individual phrases are NOT visible standalone
			await expect(
				page.locator('div', { hasText: 'A new Phrase' }).getByText(phrase1Text)
			).not.toBeVisible()
			await expect(
				page.locator('div', { hasText: 'A new Phrase' }).getByText(phrase2Text)
			).not.toBeVisible()
		} finally {
			await deletePhrase(phrase1.id)
			await deletePhrase(phrase2.id)
			await deletePlaylist(playlist.id)
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
		await page.getByTestId('sidebar-link--learn-lang-feed').click()

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

	test('allows users to upvote playlists', async ({ page }) => {
		await loginAsTestUser(page)
		const lang = 'hin'
		const nonce = Math.random().toString(36).substring(7)
		const playlistTitle = `Upvote Test Playlist ${nonce}`

		// 1. Create a playlist
		const playlist = await createPlaylist({
			lang,
			title: playlistTitle,
		})

		try {
			// 2. Navigate to feed
			await page.goto('/learn')
			await page
				.getByTestId(`deck-card-${lang}`)
				.getByTestId(`deck-card-link-${lang}`)
				.click()

			// 3. Verify playlist is visible in feed
			await expect(page.getByText(playlistTitle).first()).toBeVisible()

			// 4. Find the upvote button for this playlist
			const playlistCard = page.locator(
				`div.bg-card:has-text("${playlistTitle}")`
			)
			const upvoteButton = playlistCard.getByTestId('upvote-playlist-button')

			// 5. Verify initial upvote count is 0
			// Use aria-label or more specific selector to avoid ambiguity with "0 phrases"
			const upvoteArea = upvoteButton.locator('..')
			await expect(upvoteArea).toContainText('0')

			// 6. Click upvote button
			await upvoteButton.click()

			// 7. Verify upvote count increased to 1
			await expect(upvoteArea).toContainText('1')

			// 8. Verify button state changed (title changes to "Remove vote")
			await expect(upvoteButton).toHaveAttribute('title', 'Remove vote')

			// 9. Verify upvote in database
			const { data: upvoteInDb } = await supabase
				.from('phrase_playlist_upvote')
				.select()
				.eq('playlist_id', playlist.id)
				.eq('uid', TEST_USER_UID)
				.single()

			expect(upvoteInDb).toBeTruthy()
			expect(upvoteInDb?.playlist_id).toBe(playlist.id)
			expect(upvoteInDb?.uid).toBe(TEST_USER_UID)

			// 10. Verify upvote_count updated in playlist table
			const { data: updatedPlaylist } = await supabase
				.from('phrase_playlist')
				.select('upvote_count')
				.eq('id', playlist.id)
				.single()

			expect(updatedPlaylist?.upvote_count).toBe(1)

			// 11. Click upvote button again to remove upvote
			await upvoteButton.click()

			// 12. Verify count decreased back to 0
			await expect(upvoteArea).toContainText('0')

			// 13. Verify button state changed back (title changes back to "Vote up this playlist")
			await expect(upvoteButton).toHaveAttribute(
				'title',
				'Vote up this playlist'
			)

			// 14. Verify upvote removed from database
			const { data: removedUpvote } = await supabase
				.from('phrase_playlist_upvote')
				.select()
				.eq('playlist_id', playlist.id)
				.eq('uid', TEST_USER_UID)
				.maybeSingle()

			expect(removedUpvote).toBeNull()

			// 15. Verify upvote_count updated back to 0
			const { data: finalPlaylist } = await supabase
				.from('phrase_playlist')
				.select('upvote_count')
				.eq('id', playlist.id)
				.single()

			expect(finalPlaylist?.upvote_count).toBe(0)
		} finally {
			// Cleanup
			await deletePlaylist(playlist.id)
		}
	})
})
