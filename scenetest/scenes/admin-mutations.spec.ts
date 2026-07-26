import assert from 'node:assert/strict'
import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Poll a predicate until it holds — used where a mutation has no toast to gate
// on, or to confirm a server row after an optimistic action.
async function pollUntil(
	fn: () => Promise<boolean>,
	{ timeoutMs = 8000, intervalMs = 150 } = {}
): Promise<boolean> {
	const start = Date.now()
	/* eslint-disable no-await-in-loop */
	while (Date.now() - start < timeoutMs) {
		if (await fn()) return true
		await new Promise((r) => setTimeout(r, intervalMs))
	}
	/* eslint-enable no-await-in-loop */
	return false
}

// A seeded phrase_request auto-creates a message row via trigger; clean both up.
async function deleteRequest(requestId: string, messageId: string | null) {
	if (messageId) {
		await supabase.from('message_tag_link').delete().eq('message_id', messageId)
	}
	await supabase.from('phrase_request').delete().eq('id', requestId)
	if (messageId) await supabase.from('message').delete().eq('id', messageId)
}

test('admin edits a request prompt', async ({ actor, team }) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const original = `Admin edit target ${nonce}`
	const updated = `Admin edited prompt ${nonce}`
	let requestId = ''
	let messageId: string | null = null

	try {
		await supabase
			.from('admin_user')
			.upsert({ uid: learner.key })
			.throwOnError()
		const { data: request } = await supabase
			.from('phrase_request')
			.insert({ prompt: original, lang, requester_uid: learner.key })
			.select()
			.single()
			.throwOnError()
		requestId = request!.id
		messageId = request!.message_id ?? null

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/admin/${lang}/requests/${requestId}`)
			.up()
			.see('admin-request-detail')
			.click('admin-edit-prompt-button')
			.up()
			.typeInto('admin-edit-prompt-textarea', updated)
			.click('admin-edit-prompt-save')
			.up()
			.seeToast('toast-success')

		const saved = await pollUntil(async () => {
			const { data } = await supabase
				.from('phrase_request')
				.select('prompt')
				.eq('id', requestId)
				.single()
			return data?.prompt === updated
		})
		assert.ok(saved, 'the edited prompt should persist')
	} finally {
		if (requestId) await deleteRequest(requestId, messageId)
		await supabase.from('admin_user').delete().eq('uid', learner.key)
	}
})

test('admin archives a request', async ({ actor, team }) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	let requestId = ''
	let messageId: string | null = null

	try {
		await supabase
			.from('admin_user')
			.upsert({ uid: learner.key })
			.throwOnError()
		const { data: request } = await supabase
			.from('phrase_request')
			.insert({
				prompt: `Admin archive target ${nonce}`,
				lang,
				requester_uid: learner.key,
			})
			.select()
			.single()
			.throwOnError()
		requestId = request!.id
		messageId = request!.message_id ?? null

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo(`/admin/${lang}/requests/${requestId}`)
			.up()
			.see('admin-request-detail')
			.click('admin-archive-request-button')
			.up()
			.seeToast('toast-success')

		const archived = await pollUntil(async () => {
			const { data } = await supabase
				.from('phrase_request')
				.select('deleted')
				.eq('id', requestId)
				.single()
			return data?.deleted === true
		})
		assert.ok(archived, 'the request should be soft-deleted (deleted: true)')
	} finally {
		if (requestId) await deleteRequest(requestId, messageId)
		await supabase.from('admin_user').delete().eq('uid', learner.key)
	}
})

test('admin bulk-adds messages', async ({ actor, team }) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	const nonce = Date.now().toString(36)
	const promptA = `Bulk message alpha ${nonce}`
	const promptB = `Bulk message beta ${nonce}`

	try {
		await supabase
			.from('admin_user')
			.upsert({ uid: learner.key })
			.throwOnError()

		await learner
			.openTo('/login')
			.typeInto('email-input', learner.email!)
			.typeInto('password-input', learner.password!)
			.click('submit-button')
			.notSee('login-form')
			.openTo('/admin/messages')
			.up()
			.see('admin-messages-page')
			.click('bulk-add-toggle')
			.up()
			.click('language-selector-button')
			.up()
			.click(`language-options ${lang}`)
			.up()
			.typeInto('bulk-add-textarea', `${promptA}\n\n${promptB}`)
			.click('bulk-add-submit')
			.up()

		// No seeToast here: the success toast can outlive its 5s dismissal window
		// under CI load, and the DB poll below is the authoritative assertion that
		// the optimistic action actually persisted both requests.
		const created = await pollUntil(async () => {
			const { data } = await supabase
				.from('phrase_request')
				.select('id')
				.in('prompt', [promptA, promptB])
			return (data?.length ?? 0) === 2
		})
		assert.ok(created, 'both bulk-added requests should be persisted')
	} finally {
		const { data: rows } = await supabase
			.from('phrase_request')
			.select('id, message_id')
			.in('prompt', [promptA, promptB])
		for (const row of rows ?? []) {
			// eslint-disable-next-line no-await-in-loop
			await deleteRequest(row.id, row.message_id ?? null)
		}
		await supabase.from('admin_user').delete().eq('uid', learner.key)
	}
})
