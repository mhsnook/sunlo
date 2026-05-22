// Migration of e2e/mutations/feed.spec.ts (in progress).
//
// Ported so far: chronological order, UI-created request appears in feed,
// popular-tab sort order. Still on the e2e side: phrase provenance folding,
// playlist phrase folding, infinite scroll. Test 7 (upvote playlists) is
// already covered by feed.spec.md ("learner upvotes a playlist in feed").
//
// Fixture rows are created via the service role before the action chain is
// built, and asserted by their (nonce-tagged) text so no runtime id needs to
// reach a selector. try/finally guarantees cleanup.

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test('feed shows new requests, playlists and phrases newest-first', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const requestText = `Feed chron request ${nonce}`
	const playlistText = `Feed chron playlist ${nonce}`
	const phraseText = `Feed chron phrase ${nonce}`
	let requestId = ''
	let playlistId = ''
	let phraseId = ''

	try {
		// Create request, then playlist, then phrase — the phrase is newest.
		const { data: request } = await supabase
			.from('phrase_request')
			.insert({ lang, prompt: requestText, requester_uid: learner.key })
			.select()
			.single()
			.throwOnError()
		requestId = request!.id
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title: playlistText, uid: learner.key })
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
			.from('phrase_translation')
			.insert({
				phrase_id: phraseId,
				lang: 'eng',
				text: `Feed chron translation ${nonce}`,
				added_by: learner.key,
			})
			.throwOnError()

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/feed`)
			.up()
			.see('deck-feed-page')
			.seeText(phraseText)
			.seeText(playlistText)
			.seeText(requestText)
			.do(async (page) => {
				const topOf = async (t: string) =>
					(await page.getByText(t).first().boundingBox())?.y ?? 0
				const phraseY = await topOf(phraseText)
				const playlistY = await topOf(playlistText)
				const requestY = await topOf(requestText)
				if (!(phraseY < playlistY && playlistY < requestY))
					throw new Error(
						`feed not newest-first: phrase=${phraseY} playlist=${playlistY} request=${requestY}`
					)
			})
	} finally {
		if (phraseId) await supabase.from('phrase').delete().eq('id', phraseId)
		if (playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
		if (requestId)
			await supabase.from('phrase_request').delete().eq('id', requestId)
	}
})

test('a request created through the UI appears in the feed', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const promptText = `Feed UI-sync request ${nonce}`

	try {
		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/requests/new`)
			.up()
			.see('new-request-form')
			.typeInto('new-request-form prompt-input', promptText)
			.click('new-request-form submit-button')
			.up()
			.openTo(`/learn/${lang}/feed`)
			.up()
			.see('deck-feed-page')
			.seeText(promptText)
	} finally {
		await supabase
			.from('phrase_request')
			.delete()
			.eq('requester_uid', learner.key)
			.eq('prompt', promptText)
	}
})

test('the popular feed tab sorts items by popularity descending', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const lowText = `Feed pop-low request ${nonce}`
	const medText = `Feed pop-med playlist ${nonce}`
	const highText = `Feed pop-high request ${nonce}`
	let lowId = ''
	let medId = ''
	let highId = ''

	try {
		const { data: low } = await supabase
			.from('phrase_request')
			.insert({ lang, prompt: lowText, requester_uid: learner.key })
			.select()
			.single()
			.throwOnError()
		lowId = low!.id
		const { data: med } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title: medText, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		medId = med!.id
		const { data: high } = await supabase
			.from('phrase_request')
			.insert({ lang, prompt: highText, requester_uid: learner.key })
			.select()
			.single()
			.throwOnError()
		highId = high!.id
		// High upvote counts so the test items land on the first page above seeds.
		await supabase
			.from('phrase_request')
			.update({ upvote_count: 20 })
			.eq('id', lowId)
			.throwOnError()
		await supabase
			.from('phrase_playlist')
			.update({ upvote_count: 50 })
			.eq('id', medId)
			.throwOnError()
		await supabase
			.from('phrase_request')
			.update({ upvote_count: 100 })
			.eq('id', highId)
			.throwOnError()

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/feed`)
			.up()
			.see('deck-feed-page')
			.click('feed-tab-popular')
			.up()
			.seeText(highText)
			.seeText(medText)
			.seeText(lowText)
			.do(async (page) => {
				const topOf = async (t: string) =>
					(await page.getByText(t).first().boundingBox())?.y ?? 0
				const highY = await topOf(highText)
				const medY = await topOf(medText)
				const lowY = await topOf(lowText)
				if (!(highY < medY && medY < lowY))
					throw new Error(
						`popular feed not sorted: high=${highY} med=${medY} low=${lowY}`
					)
			})
	} finally {
		if (lowId) await supabase.from('phrase_request').delete().eq('id', lowId)
		if (medId) await supabase.from('phrase_playlist').delete().eq('id', medId)
		if (highId) await supabase.from('phrase_request').delete().eq('id', highId)
	}
})
