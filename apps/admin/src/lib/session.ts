import { queryOptions } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'

export async function getSession() {
	const { data } = await supabase.auth.getSession()
	return data.session
}

// Ends the session in this browser only, so the admin stays signed in on
// their other devices.
export const signOutHere = () => supabase.auth.signOut({ scope: 'local' })

export const accessToken = async () => (await getSession())?.access_token ?? ''

export const isAdminQuery = (uid: uuid) =>
	queryOptions({
		queryKey: ['admin', 'is-admin', uid],
		queryFn: async () => {
			const { data, error } = await supabase.rpc('is_admin')
			if (error) throw error
			return data
		},
		staleTime: Infinity,
	})
