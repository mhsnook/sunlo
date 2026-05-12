import { createFileRoute } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'

export const Route = createFileRoute('/_user/profile/change-email-confirm')({
	loader: async ({ location }) => {
		const hashParams = new URLSearchParams(location.hash)
		// console.log(`inside the loader`, location, hashParams)
		const {
			data: { user },
		} = await supabase.auth.getUser()
		return {
			userEmail: user?.email ?? '',
			error: hashParams.get('error'),
			errorDescription: hashParams.get('error_description'),
		}
	},
})
