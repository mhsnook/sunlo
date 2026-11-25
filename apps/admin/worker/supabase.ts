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

// A client that acts as the signed-in admin, so RLS applies to them. One per
// request: it carries that request's token.
export function supabaseAs(env: Env, token: string) {
	return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	})
}
