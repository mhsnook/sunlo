import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { defineConfig, defineMacro } from '@scenetest/scenes'

defineMacro('login', [
	'openTo /login',
	'typeInto email-input [self.email]',
	'typeInto password-input [self.password]',
	'click submit-button',
	'notSee login-form',
])

defineMacro('go-to-deck', [
	'openTo /learn',
	'click decks-list-grid [team.lang] deck-tile',
	'click deck-link',
	'up',
	'see deck-feed-page',
	'up',
])

defineMacro('go-to-deck-settings', [
	'click top-right-context-menu',
	'click deck-settings-menu-item',
	'up',
	'see deck-settings-page',
	'up',
	'ifClick dismiss-deck-settings-intro',
	'see deck-settings-page',
])

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default defineConfig({
	baseUrl: 'http://localhost:4173',
	scenes: './scenetest/scenes',
	noKeyboardActor: true,
	// Fail fast when an error toast appears, instead of timing out on a
	// misleading downstream assertion. console.error capture is unreliable
	// when React Query catches mutation throws via microtask after the test
	// has already failed.
	errorSelectors: [
		{ selector: 'toast-error', message: 'Error toast appeared on page' },
	],
	server: {
		supabase: createClient(supabaseUrl, supabaseServiceKey),
	},
})
