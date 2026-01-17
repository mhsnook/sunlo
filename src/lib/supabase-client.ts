import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Lazy initialization to support SSR/SPA builds where env vars may not be available at build time
let supabaseInstance: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> {
	if (!supabaseInstance) {
		if (!supabaseUrl || !anonKey) {
			throw new Error(
				'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
			)
		}
		supabaseInstance = createClient<Database>(supabaseUrl, anonKey)
	}
	return supabaseInstance
}

// Export a proxy that lazily initializes the client on first access
const supabase = new Proxy({} as SupabaseClient<Database>, {
	get(_target, prop) {
		const client = getSupabaseClient()
		const value = client[prop as keyof SupabaseClient<Database>]
		if (typeof value === 'function') {
			return value.bind(client)
		}
		return value
	},
})

export default supabase
