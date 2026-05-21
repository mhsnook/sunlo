// Happy-path coverage for the password-reset flow. Markdown can't drive this:
// it needs a recovery link minted server-side. The admin API's generateLink
// returns the link without dispatching an email, so this works in CI where
// the Inbucket mail catcher is disabled. We point the browser at the link and
// confirm the new password is accepted.
//
// A throwaway user is created and torn down per run, so no shared seed actor's
// password is disturbed (scenes may run in parallel).

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = 'sunloapp+pwreset@gmail.com'

async function deleteTestUser() {
	const { data } = await supabase.auth.admin.listUsers()
	const existing = data.users.find((u) => u.email === TEST_EMAIL)
	if (existing) await supabase.auth.admin.deleteUser(existing.id)
}

test('a recovery link lets the user set a new password', async ({ actor }) => {
	const user = await actor('visitor')

	// Fresh throwaway user — drop any leftover from a failed prior run first.
	await deleteTestUser()
	const { error: createError } = await supabase.auth.admin.createUser({
		email: TEST_EMAIL,
		password: 'the-password-being-reset',
		email_confirm: true,
	})
	if (createError) throw createError

	// Mint a recovery link the way the email flow would, then follow it.
	const { data: link, error: linkError } =
		await supabase.auth.admin.generateLink({
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
		.typeInto('password-input', 'a-freshly-chosen-password')
		.click('submit-button')
		.up()
		.seeToast('toast-success')
		.do(async () => {
			await deleteTestUser()
		})
})
