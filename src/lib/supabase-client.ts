import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !anonKey) {
	throw new Error(
		'Missing Supabase credentials. Copy .env.example to .env and populate VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from `supabase start` output.'
	)
}

const supabase = createClient<Database>(supabaseUrl, anonKey)

// getSession() reads localStorage without hitting the network when no
// session is cached, so it can't tell us that Supabase is down. Ping a
// cheap unauthenticated endpoint at boot so we can show a real error
// instead of letting every subsequent query fail with ERR_CONNECTION_REFUSED.
export async function pingSupabase(): Promise<void> {
	const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
		headers: { apikey: anonKey as string },
	})
	if (!res.ok) {
		throw new Error(`Supabase health check returned ${res.status}`)
	}
}

export default supabase
