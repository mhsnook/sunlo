import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | undefined
// One client per isolate, so getClaims() reuses its cached JWKS.
export function supabaseFor(env: Env) {
	supabase ??= createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	})
	return supabase
}
