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

export default supabase
