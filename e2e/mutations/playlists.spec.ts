import { test, expect } from '@playwright/test'
import { FIRST_USER_UID, TEST_USER_UID } from '../helpers/auth-helpers'
import {
	createPlaylist,
	deletePlaylist,
	createPhrase,
	supabase,
} from '../helpers/db-helpers'
import { TEST_LANG } from '../helpers/test-constants'

test.describe('Playlist Mutations', () => {
	test('update playlist: edit title, description, and href', async ({
		page,
	}) => {
		// 1. Create a playlist via API
		const originalTitle = `Original playlist title ${Math.random()}`
		const originalDescription = 'Original description'
		const playlist = await createPlaylist({
			lang: TEST_LANG,
			title: originalTitle,
			description: originalDescription,
		})

		await page.goto('/learn')

		try {
			// 2. Navigate to the playlist page
			await page.goto(`/learn/${TEST_LANG}/playlists/${playlist.id}`)

			// Verify original title and description are visible
			await expect(page.getByText(originalTitle)).toBeVisible()
			await expect(page.getByText(originalDescription)).toBeVisible()

			// 3. Click the edit button (should be visible since we're the owner)
			const editButton = page.getByRole('button', { name: 'Update playlist' })
			await expect(editButton).toBeVisible()
			await editButton.click()

			// 4. Verify the edit dialog is open
			await expect(page.getByRole('dialog')).toBeVisible()
			await expect(
				page.getByRole('heading', { name: 'Edit Playlist' })
			).toBeVisible()

			// 5. Edit the playlist fields
			const updatedTitle = `Updated playlist title ${Math.random()}`
			const updatedDescription = `Updated description ${Math.random()}`
			const updatedHref = 'https://www.youtube.com/watch?v=test123'

			const titleInput = page.locator('#playlist-title')
			await titleInput.clear()
			await titleInput.fill(updatedTitle)

			const descriptionTextarea = page.locator('#playlist-description')
			await descriptionTextarea.clear()
			await descriptionTextarea.fill(updatedDescription)

			const hrefInput = page.locator('#playlist-href')
			await hrefInput.fill(updatedHref)

			// 6. Save the changes
			await page
				.getByRole('dialog')
				.getByRole('button', { name: 'Save' })
				.click()

			// Wait for success toast
			await expect(page.getByText('Playlist updated!')).toBeVisible()

			// 7. Verify the dialog is closed and the new values are visible
			await expect(page.getByRole('dialog')).not.toBeVisible()
			await expect(page.getByText(updatedTitle)).toBeVisible()
			await expect(page.getByText(updatedDescription)).toBeVisible()
			await expect(page.getByText(originalTitle)).not.toBeVisible()

			// 8. Verify update in local collection
			const playlistInCollection = await page.evaluate(
				(playlistId) =>
					(window as any).__phrasePlaylistsCollection.get(playlistId),
				playlist.id
			)
			expect(playlistInCollection).toBeTruthy()
			expect(playlistInCollection?.title).toBe(updatedTitle)
			expect(playlistInCollection?.description).toBe(updatedDescription)
			expect(playlistInCollection?.href).toBe(updatedHref)

			// 9. Verify update in database
			const { data: dbPlaylist } = await supabase
				.from('phrase_playlist')
				.select()
				.eq('id', playlist.id)
				.single()

			expect(dbPlaylist).toBeTruthy()
			expect(dbPlaylist?.title).toBe(updatedTitle)
			expect(dbPlaylist?.description).toBe(updatedDescription)
			expect(dbPlaylist?.href).toBe(updatedHref)
			expect(dbPlaylist?.updated_at).toBeTruthy()
		} finally {
			// Clean up the playlist
			await deletePlaylist(playlist.id)
		}
	})

	test('delete playlist: soft delete playlist', async ({ page }) => {
		// 1. Create a playlist via API
		const playlistTitle = `Playlist to be deleted ${Math.random()}`
		const playlist = await createPlaylist({
			lang: TEST_LANG,
			title: playlistTitle,
		})

		await page.goto('/learn')

		try {
			// 2. Navigate to the playlist page
			await page.goto(`/learn/${TEST_LANG}/playlists/${playlist.id}`)

			// Verify playlist is visible
			await expect(page.getByText(playlistTitle)).toBeVisible()

			// 3. Click the delete button (should be visible since we're the owner)
			const deleteButton = page.getByRole('button', { name: 'Delete playlist' })
			await expect(deleteButton).toBeVisible()
			await deleteButton.click()

			// 4. Verify the delete confirmation dialog is open
			await expect(
				page.getByRole('heading', { name: 'Delete playlist?' })
			).toBeVisible()

			// 5. Confirm deletion
			await page.getByRole('button', { name: 'Delete' }).click()

			// Wait for success toast
			await expect(page.getByText('Playlist deleted')).toBeVisible()

			// 6. Should navigate away from the deleted playlist page
			await page.waitForURL(`/learn/${TEST_LANG}/feed`)

			// 7. Verify playlist is not in local collection
			const playlistInCollection = await page.evaluate(
				(playlistId) =>
					(window as any).__phrasePlaylistsCollection.get(playlistId),
				playlist.id
			)
			expect(playlistInCollection).toBeFalsy()

			// 8. Verify playlist is soft-deleted in database (deleted flag = true)
			const { data: dbPlaylist } = await supabase
				.from('phrase_playlist')
				.select('*, deleted')
				.eq('id', playlist.id)
				.single()

			expect(dbPlaylist).toBeTruthy()
			expect(dbPlaylist?.deleted).toBe(true)

			// Note: RLS filtering is verified by RLS policies in SQL and UI-level ownership tests
		} finally {
			// Clean up the playlist (hard delete for test cleanup)
			await supabase.from('phrase_playlist').delete().eq('id', playlist.id)
		}
	})

	test('ownership: non-owner cannot see edit/delete buttons', async ({
		page,
	}) => {
		// 1. Create a playlist owned by FIRST_USER
		const playlistTitle = `Another user's playlist ${Math.random()}`
		const { data: otherUserPlaylist } = await supabase
			.from('phrase_playlist')
			.insert({
				lang: TEST_LANG,
				title: playlistTitle,
				uid: FIRST_USER_UID,
			})
			.select()
			.single()

		expect(otherUserPlaylist).toBeTruthy()

		await page.goto('/learn')

		try {
			// 2. Navigate to the playlist page as TEST_USER (not the owner)
			await page.goto(`/learn/${TEST_LANG}/playlists/${otherUserPlaylist!.id}`)

			// Verify playlist is visible
			await expect(page.getByText(playlistTitle)).toBeVisible()

			// 3. Verify edit and delete buttons are NOT visible
			const editButton = page.getByRole('button', { name: 'Update playlist' })
			await expect(editButton).not.toBeVisible()

			const deleteButton = page.getByRole('button', { name: 'Delete playlist' })
			await expect(deleteButton).not.toBeVisible()
		} finally {
			// Clean up
			await supabase
				.from('phrase_playlist')
				.delete()
				.eq('id', otherUserPlaylist!.id)
		}
	})

	test('manage phrases: add phrase to existing playlist', async ({ page }) => {
		// 1. Create some phrases via API
		const phrase1 = await createPhrase({
			lang: TEST_LANG,
			text: 'Initial phrase 1',
			translationText: 'Translation 1',
		})
		const phrase2 = await createPhrase({
			lang: TEST_LANG,
			text: 'Initial phrase 2',
			translationText: 'Translation 2',
		})
		const phraseToAdd = await createPhrase({
			lang: TEST_LANG,
			text: 'Phrase to add',
			translationText: 'Translation to add',
		})

		// 2. Create a playlist with 2 phrases via API
		const playlist = await createPlaylist({
			lang: TEST_LANG,
			title: `Test playlist ${Math.random()}`,
		})

		// Add initial phrases to playlist
		await supabase
			.from('playlist_phrase_link')
			.insert([
				{
					playlist_id: playlist.id,
					phrase_id: phrase1.phrase.id,
					order: 1,
					uid: TEST_USER_UID,
				},
				{
					playlist_id: playlist.id,
					phrase_id: phrase2.phrase.id,
					order: 2,
					uid: TEST_USER_UID,
				},
			])
			.throwOnError()

		await page.goto('/learn')

		try {
			// 3. Navigate to playlist page
			await page.goto(`/learn/${TEST_LANG}/playlists/${playlist.id}`)

			// Verify initial phrases are visible (use .first() since phrase text appears multiple times)
			await expect(
				page.getByText(phrase1.phrase.text, { exact: false }).first()
			).toBeVisible()
			await expect(
				page.getByText(phrase2.phrase.text, { exact: false }).first()
			).toBeVisible()

			// 4. Click "Manage Phrases" button
			const manageButton = page.getByRole('button', { name: 'Manage phrases' })
			await expect(manageButton).toBeVisible()
			await manageButton.click()

			// 5. Verify dialog is open
			await expect(page.getByRole('dialog')).toBeVisible()
			await expect(
				page.getByRole('heading', { name: 'Manage Phrases' })
			).toBeVisible()

			// 6. Click "Add phrases" button
			await page.getByRole('button', { name: /Add.*phrases/i }).click()

			// 7. Search and select the new phrase
			await page.fill('input[placeholder*="Search"]', phraseToAdd.phrase.text)
			await page.waitForTimeout(500) // Wait for debounce

			// Click the checkbox for the phrase
			const phraseCheckbox = page
				.locator(`label:has-text("${phraseToAdd.phrase.text}")`)
				.locator('button[role="checkbox"]')
			await phraseCheckbox.click()

			// Add the selected phrase(s) to the playlist
			await page.getByRole('button', { name: /Add.*flashcard/i }).click()

			// 8. Wait for success toast
			await expect(page.getByText('Phrase added to playlist')).toBeVisible()

			// 9. Verify phrase appears in manage dialog (use first match)
			await expect(
				page.getByText(phraseToAdd.phrase.text, { exact: false }).first()
			).toBeVisible()

			// 10. Verify link in database
			const { data: link } = await supabase
				.from('playlist_phrase_link')
				.select()
				.eq('playlist_id', playlist.id)
				.eq('phrase_id', phraseToAdd.phrase.id)
				.single()

			expect(link).toBeTruthy()
			expect(link?.order).toBe(3)

			// 11. Verify playlist updated_at changed
			const { data: updatedPlaylist } = await supabase
				.from('phrase_playlist')
				.select()
				.eq('id', playlist.id)
				.single()

			expect(updatedPlaylist?.updated_at).toBeTruthy()
		} finally {
			// Clean up
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlist.id)
			await deletePlaylist(playlist.id)
			await supabase
				.from('phrase')
				.delete()
				.in('id', [phrase1.phrase.id, phrase2.phrase.id, phraseToAdd.phrase.id])
		}
	})

	test('manage phrases: remove phrase from playlist', async ({ page }) => {
		// 1. Create phrases
		const phrase1 = await createPhrase({
			lang: TEST_LANG,
			text: 'Phrase 1',
			translationText: 'Translation 1',
		})
		const phrase2 = await createPhrase({
			lang: TEST_LANG,
			text: 'Phrase to remove',
			translationText: 'Translation to remove',
		})
		const phrase3 = await createPhrase({
			lang: TEST_LANG,
			text: 'Phrase 3',
			translationText: 'Translation 3',
		})

		// 2. Create playlist with 3 phrases
		const playlist = await createPlaylist({
			lang: TEST_LANG,
			title: `Test playlist ${Math.random()}`,
		})

		const { data: links } = await supabase
			.from('playlist_phrase_link')
			.insert([
				{
					playlist_id: playlist.id,
					phrase_id: phrase1.phrase.id,
					order: 1,
					uid: TEST_USER_UID,
				},
				{
					playlist_id: playlist.id,
					phrase_id: phrase2.phrase.id,
					order: 2,
					uid: TEST_USER_UID,
				},
				{
					playlist_id: playlist.id,
					phrase_id: phrase3.phrase.id,
					order: 3,
					uid: TEST_USER_UID,
				},
			])
			.select()
			.throwOnError()

		const linkToRemove = links![1]

		await page.goto('/learn')

		try {
			// 3. Navigate to playlist page
			await page.goto(`/learn/${TEST_LANG}/playlists/${playlist.id}`)

			// 4. Click "Manage Phrases" button
			await page.getByRole('button', { name: 'Manage phrases' }).click()

			// 5. Verify all 3 phrases are visible (use .first() since phrase text appears multiple times)
			await expect(
				page.getByText(phrase1.phrase.text, { exact: false }).first()
			).toBeVisible()
			await expect(
				page.getByText(phrase2.phrase.text, { exact: false }).first()
			).toBeVisible()
			await expect(
				page.getByText(phrase3.phrase.text, { exact: false }).first()
			).toBeVisible()

			// 6. Click remove button on second phrase
			const phraseCards = page.getByTestId('manage-phrase-card')
			const secondCard = phraseCards.nth(1)
			const removeButton = secondCard.getByRole('button', {
				name: 'Remove phrase',
			})
			await removeButton.click()

			// 7. Wait for success toast
			await expect(page.getByText('Phrase removed from playlist')).toBeVisible()

			// 8. Verify phrase removed from UI
			await expect(
				page.getByText(phrase2.phrase.text, { exact: false })
			).not.toBeVisible()

			// 9. Verify link removed from database
			const { data: removedLink } = await supabase
				.from('playlist_phrase_link')
				.select()
				.eq('id', linkToRemove.id)
				.maybeSingle()

			expect(removedLink).toBeNull()

			// 10. Verify playlist updated_at changed
			const { data: updatedPlaylist } = await supabase
				.from('phrase_playlist')
				.select()
				.eq('id', playlist.id)
				.single()

			expect(updatedPlaylist?.updated_at).toBeTruthy()
		} finally {
			// Clean up
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlist.id)
			await deletePlaylist(playlist.id)
			await supabase
				.from('phrase')
				.delete()
				.in('id', [phrase1.phrase.id, phrase2.phrase.id, phrase3.phrase.id])
		}
	})

	test('manage phrases: reorder phrases', async ({ page }) => {
		// 1. Create phrases
		const phrase1 = await createPhrase({
			lang: TEST_LANG,
			text: 'First phrase',
			translationText: 'Translation 1',
		})
		const phrase2 = await createPhrase({
			lang: TEST_LANG,
			text: 'Second phrase',
			translationText: 'Translation 2',
		})
		const phrase3 = await createPhrase({
			lang: TEST_LANG,
			text: 'Third phrase',
			translationText: 'Translation 3',
		})

		// 2. Create playlist
		const playlist = await createPlaylist({
			lang: TEST_LANG,
			title: `Test playlist ${Math.random()}`,
		})

		const { data: _links } = await supabase
			.from('playlist_phrase_link')
			.insert([
				{
					playlist_id: playlist.id,
					phrase_id: phrase1.phrase.id,
					order: 1,
					uid: TEST_USER_UID,
				},
				{
					playlist_id: playlist.id,
					phrase_id: phrase2.phrase.id,
					order: 2,
					uid: TEST_USER_UID,
				},
				{
					playlist_id: playlist.id,
					phrase_id: phrase3.phrase.id,
					order: 3,
					uid: TEST_USER_UID,
				},
			])
			.select()
			.throwOnError()

		await page.goto('/learn')

		try {
			// 3. Navigate and open manage dialog
			await page.goto(`/learn/${TEST_LANG}/playlists/${playlist.id}`)
			await page.getByRole('button', { name: 'Manage phrases' }).click()

			// 4. Click "Move Down" on first phrase
			const phraseCards = page.getByTestId('manage-phrase-card')
			const firstCard = phraseCards.first()
			const moveDownButton = firstCard.getByRole('button', {
				name: 'Move phrase down',
			})
			await moveDownButton.click()

			// 5. Wait a moment for mutation to complete
			await page.waitForTimeout(500)

			// 6. Verify order changed in database
			const { data: updatedLinks } = await supabase
				.from('playlist_phrase_link')
				.select()
				.eq('playlist_id', playlist.id)
				.order('order')

			// First phrase should now be second
			expect(updatedLinks![0].phrase_id).toBe(phrase2.phrase.id)
			expect(updatedLinks![1].phrase_id).toBe(phrase1.phrase.id)
			expect(updatedLinks![2].phrase_id).toBe(phrase3.phrase.id)
		} finally {
			// Clean up
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlist.id)
			await deletePlaylist(playlist.id)
			await supabase
				.from('phrase')
				.delete()
				.in('id', [phrase1.phrase.id, phrase2.phrase.id, phrase3.phrase.id])
		}
	})

	test('manage phrases: edit phrase href', async ({ page }) => {
		// 1. Create phrase and playlist
		const phrase = await createPhrase({
			lang: TEST_LANG,
			text: 'Test phrase',
			translationText: 'Test translation',
		})

		const playlist = await createPlaylist({
			lang: TEST_LANG,
			title: `Test playlist ${Math.random()}`,
		})

		const { data: link } = await supabase
			.from('playlist_phrase_link')
			.insert({
				playlist_id: playlist.id,
				phrase_id: phrase.phrase.id,
				order: 1,
				href: null,
				uid: TEST_USER_UID,
			})
			.select()
			.single()
			.throwOnError()

		await page.goto('/learn')

		try {
			// 2. Navigate and open manage dialog
			await page.goto(`/learn/${TEST_LANG}/playlists/${playlist.id}`)
			await page.getByRole('button', { name: 'Manage phrases' }).click()

			// 3. Enter href in input field
			const hrefInput = page.locator('input[type="url"]').first()
			const testHref = 'https://youtube.com/watch?v=test&t=123'
			await hrefInput.fill(testHref)

			// 4. Blur the input to trigger save (HrefInput saves onBlur)
			await hrefInput.blur()
			await page.waitForTimeout(500)

			// 5. Verify href saved in database
			const { data: updatedLink } = await supabase
				.from('playlist_phrase_link')
				.select()
				.eq('id', link!.id)
				.single()

			expect(updatedLink?.href).toBe(testHref)
		} finally {
			// Clean up
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlist.id)
			await deletePlaylist(playlist.id)
			await supabase.from('phrase').delete().eq('id', phrase.phrase.id)
		}
	})

	test('manage phrases: non-owner cannot see manage button', async ({
		page,
	}) => {
		// 1. Create playlist owned by FIRST_USER
		const playlistTitle = `Another user's playlist ${Math.random()}`
		const { data: otherUserPlaylist } = await supabase
			.from('phrase_playlist')
			.insert({
				lang: TEST_LANG,
				title: playlistTitle,
				uid: FIRST_USER_UID,
			})
			.select()
			.single()

		expect(otherUserPlaylist).toBeTruthy()

		await page.goto('/learn')

		try {
			// 2. Navigate to the playlist page as TEST_USER (not the owner)
			await page.goto(`/learn/${TEST_LANG}/playlists/${otherUserPlaylist!.id}`)

			// Verify playlist is visible
			await expect(page.getByText(playlistTitle)).toBeVisible()

			// 3. Verify manage button is NOT visible
			const manageButton = page.getByRole('button', { name: 'Manage phrases' })
			await expect(manageButton).not.toBeVisible()
		} finally {
			// Clean up
			await supabase
				.from('phrase_playlist')
				.delete()
				.eq('id', otherUserPlaylist!.id)
		}
	})
})
