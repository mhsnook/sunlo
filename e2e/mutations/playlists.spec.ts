import { test, expect } from '@playwright/test'
import { loginAsTestUser, FIRST_USER_UID } from '../helpers/auth-helpers'
import { createPlaylist, deletePlaylist, supabase } from '../helpers/db-helpers'

test.describe('Playlist Mutations', () => {
	test('update playlist: edit title, description, and href', async ({
		page,
	}) => {
		// 1. Create a playlist via API
		const originalTitle = `Original playlist title ${Math.random()}`
		const originalDescription = 'Original description'
		const playlist = await createPlaylist({
			lang: 'hin',
			title: originalTitle,
			description: originalDescription,
		})

		await loginAsTestUser(page)

		try {
			// 2. Navigate to the playlist page
			await page.goto(`/learn/hin/playlists/${playlist.id}`)

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
			lang: 'hin',
			title: playlistTitle,
		})

		await loginAsTestUser(page)

		try {
			// 2. Navigate to the playlist page
			await page.goto(`/learn/hin/playlists/${playlist.id}`)

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
			await page.waitForURL('/learn/hin/feed')

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
				lang: 'hin',
				title: playlistTitle,
				uid: FIRST_USER_UID,
			})
			.select()
			.single()

		expect(otherUserPlaylist).toBeTruthy()

		await loginAsTestUser(page)

		try {
			// 2. Navigate to the playlist page as TEST_USER (not the owner)
			await page.goto(`/learn/hin/playlists/${otherUserPlaylist!.id}`)

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
})
