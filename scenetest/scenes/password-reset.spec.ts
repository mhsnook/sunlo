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
import { deleteAuthUsers } from '../support/db'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY)

const TEST_EMAIL = 'sunloapp+pwreset@gmail.com'
const NEW_PASSWORD = 'a-freshly-chosen-password'

/**
 * Creates a fresh throwaway user (dropping any leftover from a failed prior
 * run first) and mints a recovery link the way the email flow would.
 */
async function recoveryLink(email: string, redirectPath: string) {
	await deleteAuthUsers(email)
	const { error: createError } = await admin.auth.admin.createUser({
		email,
		password: 'the-password-being-reset',
		email_confirm: true,
	})
	if (createError) throw createError

	const { data: link, error: linkError } = await admin.auth.admin.generateLink({
		type: 'recovery',
		email,
		options: { redirectTo: `http://localhost:5173${redirectPath}` },
	})
	if (linkError || !link.properties) {
		throw linkError ?? new Error('generateLink returned no properties')
	}
	return link.properties.action_link
}

test('a recovery link lets the user set a new password', async ({ actor }) => {
	const user = await actor('visitor')
	const link = await recoveryLink(TEST_EMAIL, '/set-new-password')

	await user
		.openTo(link)
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
				await deleteAuthUsers(TEST_EMAIL)
			}
		})
})

// A guest who signs up from a friend's invite gets a link to
// /set-new-password?referrer=<friend>. After the password, they go on to
// onboarding, which ends in a chat with that friend.
test('a link with a referrer goes on to onboarding', async ({ actor }) => {
	const email = 'sunloapp+pwreferrer@gmail.com'
	const referrer = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	const user = await actor('visitor')

	const link = await recoveryLink(
		email,
		`/set-new-password?referrer=${referrer}`
	)

	await user
		.openTo(link)
		.up()
		.see('password-reset-form')
		.typeInto('password-input', NEW_PASSWORD)
		.click('submit-button')
		.up()
		.click('password-reset-continue')
		.up()
		.see('getting-started-page')
		.do(async (page) => {
			try {
				const url = new URL(page.url())
				if (url.searchParams.get('referrer') !== referrer) {
					throw new Error(`referrer lost on the way to ${page.url()}`)
				}
			} finally {
				await deleteAuthUsers(email)
			}
		})
})
