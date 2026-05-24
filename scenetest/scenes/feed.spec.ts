// oxlint-disable no-await-in-loop

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

test('a request-linked phrase is folded into the request, not shown standalone', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const requestText = `Feed provenance request ${nonce}`
	const phraseText = `Feed provenance phrase ${nonce}`
	let requestId = ''
	let phraseId = ''
	let commentId = ''
	let linkId = ''

	try {
		const { data: request } = await supabase
			.from('phrase_request')
			.insert({ lang, prompt: requestText, requester_uid: learner.key })
			.select()
			.single()
			.throwOnError()
		requestId = request!.id
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
				text: `Feed provenance translation ${nonce}`,
				added_by: learner.key,
			})
			.throwOnError()
		const { data: comment } = await supabase
			.from('request_comment')
			.insert({
				request_id: requestId,
				uid: learner.key,
				content: `Linked answer ${nonce}`,
			})
			.select()
			.single()
			.throwOnError()
		commentId = comment!.id
		const { data: link } = await supabase
			.from('comment_phrase_link')
			.insert({
				request_id: requestId,
				comment_id: commentId,
				phrase_id: phraseId,
				uid: learner.key,
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
			.openTo(`/learn/${lang}/feed`)
			.up()
			.see('deck-feed-page')
			.seeText(requestText)
			.do(async (page) => {
				const requestItem = page
					.locator('[data-name="feed-item-request"]')
					.filter({ hasText: requestText })
				if ((await requestItem.count()) === 0)
					throw new Error('request missing from feed')
				// The answer count is a live query over commentPhraseLinksCollection
				// (useRequestCounts), which syncs lazily once a component
				// subscribes — wait for the request item to settle to "1 answer".
				await requestItem
					.filter({ hasText: /1 answer/i })
					.first()
					.waitFor({ state: 'visible', timeout: 15000 })
				// The answer phrase is folded into the request, not rendered as a
				// standalone phrase activity.
				const standalone = page
					.locator('[data-name="feed-item-phrase"]')
					.filter({ hasText: phraseText })
				if ((await standalone.count()) > 0)
					throw new Error(
						'request-linked phrase shown as a standalone feed item'
					)
			})
	} finally {
		if (linkId)
			await supabase.from('comment_phrase_link').delete().eq('id', linkId)
		if (commentId)
			await supabase.from('request_comment').delete().eq('id', commentId)
		if (phraseId) await supabase.from('phrase').delete().eq('id', phraseId)
		if (requestId)
			await supabase.from('phrase_request').delete().eq('id', requestId)
	}
})

test('playlist phrases are folded into the playlist activity', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const playlistTitle = `Feed folding playlist ${nonce}`
	const phrase1Text = `Feed folding phrase one ${nonce}`
	const phrase2Text = `Feed folding phrase two ${nonce}`
	let playlistId = ''
	const phraseIds: Array<string> = []

	try {
		const { data: playlist } = await supabase
			.from('phrase_playlist')
			.insert({ lang, title: playlistTitle, uid: learner.key })
			.select()
			.single()
			.throwOnError()
		playlistId = playlist!.id
		for (const text of [phrase1Text, phrase2Text]) {
			const { data: phrase } = await supabase
				.from('phrase')
				.insert({ lang, text, added_by: learner.key })
				.select()
				.single()
				.throwOnError()
			phraseIds.push(phrase!.id)
			await supabase
				.from('phrase_translation')
				.insert({
					phrase_id: phrase!.id,
					lang: 'eng',
					text: `${text} translation`,
					added_by: learner.key,
				})
				.throwOnError()
			await supabase
				.from('playlist_phrase_link')
				.insert({
					playlist_id: playlistId,
					phrase_id: phrase!.id,
					uid: learner.key,
				})
				.throwOnError()
		}

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/feed`)
			.up()
			.see('deck-feed-page')
			.seeText(playlistTitle)
			.do(async (page) => {
				const playlistItem = page
					.locator('[data-name="feed-item-playlist"]')
					.filter({ hasText: playlistTitle })
				if ((await playlistItem.count()) === 0)
					throw new Error('playlist missing from feed')
				const itemText = await playlistItem.first().innerText()
				if (!/created a playlist/i.test(itemText))
					throw new Error(
						`playlist item missing "created a playlist": ${itemText}`
					)
				if (!/2 phrases/i.test(itemText))
					throw new Error(`playlist item missing "2 phrases": ${itemText}`)
				for (const phraseText of [phrase1Text, phrase2Text]) {
					const standalone = page
						.locator('[data-name="feed-item-phrase"]')
						.filter({ hasText: phraseText })
					if ((await standalone.count()) > 0)
						throw new Error(`playlist phrase shown standalone: ${phraseText}`)
				}
			})
	} finally {
		if (playlistId)
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('playlist_id', playlistId)
		for (const id of phraseIds)
			await supabase.from('phrase').delete().eq('id', id)
		if (playlistId)
			await supabase.from('phrase_playlist').delete().eq('id', playlistId)
	}
})

test('the feed loads more items on demand', async ({ actor, team }) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	let beforeCount = 0

	try {
		// Enough requests to push past the first page so load-more renders.
		const rows = Array.from({ length: 25 }, (_, i) => ({
			lang,
			prompt: `Feed paginate request ${nonce} #${i}`,
			requester_uid: learner.key,
		}))
		await supabase.from('phrase_request').insert(rows).throwOnError()

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/learn/${lang}/feed`)
			.up()
			.see('deck-feed-page')
			.see('load-more-button')
			.do(async (page) => {
				beforeCount = await page.locator('[data-feed-item]').count()
			})
			.click('load-more-button')
			.up()
			.do(async (page) => {
				const afterCount = await page.locator('[data-feed-item]').count()
				if (!(afterCount > beforeCount))
					throw new Error(
						`load-more added no items: before=${beforeCount} after=${afterCount}`
					)
			})
	} finally {
		await supabase
			.from('phrase_request')
			.delete()
			.eq('requester_uid', learner.key)
			.like('prompt', `Feed paginate request ${nonce}%`)
	}
})
