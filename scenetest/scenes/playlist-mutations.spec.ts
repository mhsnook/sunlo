import assert from 'node:assert/strict'
import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Poll a predicate until it holds. Optimistic mutations without a success toast
// (reorder, bulk-add-to-deck) have no UI signal for server-write completion, so
// we wait for the persisted row rather than asserting on a fixed delay.
async function pollUntil(
	fn: () => Promise<boolean>,
	{ timeoutMs = 8000, intervalMs = 150 } = {}
): Promise<boolean> {
	const start = Date.now()
	// Sequential by design — each tick must observe the previous result.
	/* eslint-disable no-await-in-loop */
	while (Date.now() - start < timeoutMs) {
		if (await fn()) return true
		await new Promise((r) => setTimeout(r, intervalMs))
	}
	/* eslint-enable no-await-in-loop */
	return false
}

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

test('learner adds an existing phrase to their playlist', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const title = `Playlist for add ${nonce}`
	const phraseText = `Addable phrase ${nonce}`
	let playlistId = ''
	let phraseId = ''

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id
		const { data: phrase } = await supabase
			.from('phrase')
			.insert({ lang, text: phraseText, added_by: learner.key })
			.select()
			.single()
			.throwOnError()
		phraseId = phrase!.id

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.click('manage-phrases-button')
			.up()
			.see('manage-phrases-dialog')
			.click('open-phrase-picker')
			.up()
			.typeInto('phrase-search-input', phraseText)
			.up()
			.click('phrase-picker-item')
			.up()
			.seeToast('toast-success')

		const { data: links } = await supabase
			.from('playlist_phrase_link')
			.select('phrase_id')
			.eq('playlist_id', playlistId)
			.throwOnError()
		assert.equal(links?.length, 1, 'exactly one phrase link should exist')
		assert.equal(
			links![0].phrase_id,
			phraseId,
			'the link points at the added phrase'
		)
	} finally {
		if (playlistId) {
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
		}
		if (phraseId) await supabase.from('phrase').delete().eq('id', phraseId)
	}
})

test('learner removes a phrase from their playlist', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const title = `Playlist for remove ${nonce}`
	const phraseText = `Removable phrase ${nonce}`
	let playlistId = ''
	let phraseId = ''

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id
		const { data: phrase } = await supabase
			.from('phrase')
			.insert({ lang, text: phraseText, added_by: learner.key })
			.select()
			.single()
			.throwOnError()
		phraseId = phrase!.id
		await supabase
			.from('playlist_phrase_link')
			.insert({
				playlist_id: playlistId,
				phrase_id: phraseId,
				uid: learner.key,
				order: 1,
			})
			.throwOnError()

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.click('manage-phrases-button')
			.up()
			.see('manage-phrases-dialog')
			.see('manage-phrase-card')
			.click('remove-phrase-button')
			.up()
			.seeToast('toast-success')
			.notSee('manage-phrase-card')

		const { data: links } = await supabase
			.from('playlist_phrase_link')
			.select('id')
			.eq('playlist_id', playlistId)
			.throwOnError()
		assert.equal(links?.length, 0, 'the link should be deleted')
	} finally {
		if (playlistId) {
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
		}
		if (phraseId) await supabase.from('phrase').delete().eq('id', phraseId)
	}
})

test('learner reorders phrases in their playlist', async ({ actor, team }) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const title = `Playlist for reorder ${nonce}`
	let playlistId = ''
	const phraseIds: Array<string> = []

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id

		// Alpha at order 1, Beta at order 2. Moving Alpha down should swap them.
		const { data: phrases } = await supabase
			.from('phrase')
			.insert([
				{ lang, text: `Reorder alpha ${nonce}`, added_by: learner.key },
				{ lang, text: `Reorder beta ${nonce}`, added_by: learner.key },
			])
			.select()
			.throwOnError()
		const alpha = phrases!.find((p) => p.text.includes('alpha'))!
		const beta = phrases!.find((p) => p.text.includes('beta'))!
		phraseIds.push(alpha.id, beta.id)
		const { data: seededLinks } = await supabase
			.from('playlist_phrase_link')
			.insert([
				{
					playlist_id: playlistId,
					phrase_id: alpha.id,
					uid: learner.key,
					order: 1,
				},
				{
					playlist_id: playlistId,
					phrase_id: beta.id,
					uid: learner.key,
					order: 2,
				},
			])
			.select()
			.throwOnError()
		const linkIds = {
			alpha: seededLinks!.find((l) => l.phrase_id === alpha.id)!.id,
			beta: seededLinks!.find((l) => l.phrase_id === beta.id)!.id,
		}

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.click('manage-phrases-button')
			.up()
			.see('manage-phrases-dialog')
			// Two cards render two down-buttons; #1 is the first card (Alpha,
			// order 1), which swaps orders with Beta when moved down.
			.click('move-phrase-down-button #1')
			.up()

		// Reorder has no success toast, so wait for the swapped orders to persist.
		const swapped = await pollUntil(async () => {
			const { data } = await supabase
				.from('playlist_phrase_link')
				.select('id, order')
				.eq('playlist_id', playlistId)
			const byId = new Map(data?.map((l) => [l.id, l.order]))
			return byId.get(linkIds.alpha) === 2 && byId.get(linkIds.beta) === 1
		})
		assert.ok(swapped, 'Alpha and Beta order values should be swapped')
	} finally {
		if (playlistId) {
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
		}
		if (phraseIds.length)
			await supabase.from('phrase').delete().in('id', phraseIds)
	}
})

test('learner bulk-adds playlist phrases to their deck', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const title = `Playlist for deck-add ${nonce}`
	let playlistId = ''
	const phraseIds: Array<string> = []

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id

		const { data: phrases } = await supabase
			.from('phrase')
			.insert(
				[`Deck-add one ${nonce}`, `Deck-add two ${nonce}`].map((text) => ({
					lang,
					text,
					added_by: learner.key,
				}))
			)
			.select()
			.throwOnError()
		phraseIds.push(...phrases!.map((p) => p.id))
		await supabase
			.from('playlist_phrase_link')
			.insert(
				phrases!.map((p, i) => ({
					playlist_id: playlistId,
					phrase_id: p.id,
					uid: learner.key,
					order: i + 1,
				}))
			)
			.throwOnError()

		// These phrases have no cards yet, so they count as "not in deck" and the
		// bulk-add button appears (the learner already owns a full-lang deck).
		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.click('bulk-add-playlist-to-deck')
			.up()
			.seeToast('toast-success')

		const created = await pollUntil(async () => {
			const { data } = await supabase
				.from('user_card')
				.select('id')
				.eq('uid', learner.key)
				.in('phrase_id', phraseIds)
			return (data?.length ?? 0) >= phraseIds.length
		})
		assert.ok(created, 'user_card rows should be created for the added phrases')
	} finally {
		if (phraseIds.length) {
			await supabase.from('user_card').delete().in('phrase_id', phraseIds)
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlistId)
		}
		if (playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
		if (phraseIds.length)
			await supabase.from('phrase').delete().in('id', phraseIds)
	}
})

test('learner sets a timestamp link on a playlist phrase', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const title = `Playlist for href ${nonce}`
	const url = `https://youtu.be/${nonce}?t=42`
	let playlistId = ''
	let phraseId = ''
	let linkId = ''

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id
		const { data: phrase } = await supabase
			.from('phrase')
			.insert({ lang, text: `Href phrase ${nonce}`, added_by: learner.key })
			.select()
			.single()
			.throwOnError()
		phraseId = phrase!.id
		const { data: link } = await supabase
			.from('playlist_phrase_link')
			.insert({
				playlist_id: playlistId,
				phrase_id: phraseId,
				uid: learner.key,
				order: 1,
			})
			.select()
			.single()
			.throwOnError()
		linkId = link!.id

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.click('manage-phrases-button')
			.up()
			.see('manage-phrases-dialog')
			.typeInto('link-href-input', url)
			// The field saves on blur; clicking the dialog body moves focus off it.
			.click('manage-phrases-dialog')
			.up()

		const saved = await pollUntil(async () => {
			const { data } = await supabase
				.from('playlist_phrase_link')
				.select('href')
				.eq('id', linkId)
				.single()
			return data?.href === url
		})
		assert.ok(saved, 'the timestamp link should persist on the phrase link')
	} finally {
		if (playlistId) {
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
		}
		if (phraseId) await supabase.from('phrase').delete().eq('id', phraseId)
	}
})

test('an invalid timestamp link is rejected and not saved', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const title = `Playlist for bad href ${nonce}`
	let playlistId = ''
	let phraseId = ''
	let linkId = ''

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id
		const { data: phrase } = await supabase
			.from('phrase')
			.insert({ lang, text: `Bad href phrase ${nonce}`, added_by: learner.key })
			.select()
			.single()
			.throwOnError()
		phraseId = phrase!.id
		const { data: link } = await supabase
			.from('playlist_phrase_link')
			.insert({
				playlist_id: playlistId,
				phrase_id: phraseId,
				uid: learner.key,
				order: 1,
			})
			.select()
			.single()
			.throwOnError()
		linkId = link!.id

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/playlists/${playlistId}`)
			.up()
			.see('playlist-detail-page')
			.click('manage-phrases-button')
			.up()
			.see('manage-phrases-dialog')
			.typeInto('link-href-input', 'not a url')
			.click('manage-phrases-dialog')
			.up()
			// Validation runs synchronously on blur, before any save — the visible
			// error proves onSave never fired.
			.see('link-href-error')

		const { data } = await supabase
			.from('playlist_phrase_link')
			.select('href')
			.eq('id', linkId)
			.single()
			.throwOnError()
		assert.equal(data?.href, null, 'an invalid URL must not be persisted')
	} finally {
		if (playlistId) {
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
		}
		if (phraseId) await supabase.from('phrase').delete().eq('id', phraseId)
	}
})
