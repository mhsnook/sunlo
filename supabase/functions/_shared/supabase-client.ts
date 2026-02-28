import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Create a Supabase admin client using service role key.
 * Used by Edge Functions for privileged database operations.
 */
export function createAdminClient() {
	const supabaseUrl = Deno.env.get('SUPABASE_URL')
	const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
	}

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
}
