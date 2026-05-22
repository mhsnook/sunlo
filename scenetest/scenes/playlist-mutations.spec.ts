import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test('learner deletes their playlist', async ({ actor, team }) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const title = `Playlist to delete ${nonce}`
	let playlistId = ''

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.seeText(title)
			.click('delete-playlist-button')
			.up()
			.see('delete-playlist-dialog')
			.click('confirm-delete-button')
			.up()
			.seeToast('toast-success')
			// delete navigates back to the language home (deck feed)
			.see('deck-feed-page')
	} finally {
		// Hard-delete; the UI does a soft-delete (deleted: true).
		if (playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
	}
})

test('a non-owner sees no owner controls on a playlist', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const friend = await actor('friend')
	const nonce = Date.now().toString(36)
	const title = `Friend's playlist ${nonce}`
	let playlistId = ''

	try {
		// A playlist owned by someone other than the viewing learner.
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: friend.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.seeText(title)
			.notSee('update-playlist-button')
			.notSee('delete-playlist-button')
			.notSee('manage-phrases-button')
	} finally {
		if (playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
	}
})
