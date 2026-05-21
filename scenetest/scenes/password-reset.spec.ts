// Happy-path coverage for the password-reset flow. Markdown can't drive this:
// it needs a recovery link minted server-side. The admin API's generateLink
// returns the link without dispatching an email, so this works in CI where
// the Inbucket mail catcher is disabled. We point the browser at the link,
// set a new password, and confirm that password actually works for signing in.
//
// A throwaway user is created and torn down per run, so no shared seed actor's
// password is disturbed.

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY)

const TEST_EMAIL = 'sunloapp+pwreset@gmail.com'
const NEW_PASSWORD = 'a-freshly-chosen-password'

async function deleteTestUser() {
	const { data } = await admin.auth.admin.listUsers()
	const existing = data.users.find((u) => u.email === TEST_EMAIL)
	if (existing) await admin.auth.admin.deleteUser(existing.id)
}

test('a recovery link lets the user set a new password', async ({ actor }) => {
	const user = await actor('visitor')

	// Fresh throwaway user — drop any leftover from a failed prior run first.
	await deleteTestUser()
	const { error: createError } = await admin.auth.admin.createUser({
		email: TEST_EMAIL,
		password: 'the-password-being-reset',
		email_confirm: true,
	})
	if (createError) throw createError

	// Mint a recovery link the way the email flow would, then follow it.
	const { data: link, error: linkError } = await admin.auth.admin.generateLink({
		type: 'recovery',
		email: TEST_EMAIL,
		options: { redirectTo: 'http://localhost:5173/set-new-password' },
	})
	if (linkError || !link.properties) {
		throw linkError ?? new Error('generateLink returned no properties')
	}

	await user
		.openTo(link.properties.action_link)
		.up()
		.see('password-reset-form')
		.typeInto('password-input', NEW_PASSWORD)
		.click('submit-button')
		.up()
		.seeToast('toast-success')
		.do(async () => {
			try {
				// The reset only counts if the new password actually works for a
				// fresh login. A separate client with persistSession off keeps
				// this check self-contained.
				const checkClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
					auth: { persistSession: false, autoRefreshToken: false },
				})
				const { error } = await checkClient.auth.signInWithPassword({
					email: TEST_EMAIL,
					password: NEW_PASSWORD,
				})
				if (error) {
					throw new Error(`new password rejected at login: ${error.message}`)
				}
			} finally {
				await deleteTestUser()
			}
		})
})
