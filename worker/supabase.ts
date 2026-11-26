import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/supabase'

let supabase: SupabaseClient<Database> | undefined
// One client per isolate, so getClaims() reuses its cached JWKS.
export function supabaseFor(env: Env) {
	supabase ??= createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	})
	return supabase
}
