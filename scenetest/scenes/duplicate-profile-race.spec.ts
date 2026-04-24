// Issue #134 - onError guard on the profile-creation mutation.
//
// Scene companion to duplicate-profile.spec.md, using the
// TypeScript API because we need to mutate server state mid-scene to
// simulate the race the issue describes (profile appears between form
// render and submit). Once the fix lands, submitting the form should
// recover gracefully: either the mutation succeeds (upsert finds the
// existing row) or onError calls getUser()+redirect so the user ends on
// /welcome. Either way the scene should finish without a toast-error.

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test('profile inserted mid-submit still lands on welcome', async ({
	actor,
}) => {
	const newUser = await actor('new-user')
	const uid = newUser.key

	await newUser
		.do(async () => {
			await supabase.from('user_profile').delete().eq('uid', uid)
		})
		.openTo('/login')
		.typeInto('email-input', newUser.email!)
		.typeInto('password-input', newUser.password!)
		.click('login-submit-button')
		.notSee('login-form')
		.see('getting-started-page')
		.typeInto('username-input', 'RaceNewcomer')
		.do(async () => {
			// Insert the profile out-of-band before the form submits. This
			// simulates a second tab or stale auth cache. The scene then clicks
			// submit and the mutation collides with the pre-existing row.
			await supabase.from('user_profile').upsert({
				uid,
				username: 'GhostNewcomer',
				languages_known: [{ lang: 'eng', level: 'fluent' }],
			})
		})
		.click('save-profile-button')
		.up()
		.notSee('toast-error')
		.see('welcome-page')
		.do(async () => {
			await supabase.from('user_profile').delete().eq('uid', uid)
		})
})
