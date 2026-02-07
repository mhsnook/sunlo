import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { defineConfig, defineMacro } from '@scenetest/scenes'

defineMacro('login', [
	'openTo /login',
	'typeInto email-input [self.email]',
	'typeInto password-input [self.password]',
	'click login-submit-button',
	'notSee login-form',
])

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default defineConfig({
	baseUrl: 'http://localhost:5173',
	scenes: './scenetest/scenes',
	server: {
		supabase: createClient(supabaseUrl, supabaseServiceKey),
	},
})
