import { useContext } from 'react'
import supabase from '@/lib/supabase-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AuthContext } from '@/components/auth-context'
import { clearUser } from './collections'

// Access the context's value from inside a provider
export function useAuth() {
	const context = useContext(AuthContext)

	if (context === null) {
		throw new Error('You need to wrap AuthProvider.')
	}
	return context
}

export const useSignOut = () => {
	const navigate = useNavigate()
	const client = useQueryClient()

	return useMutation({
		mutationFn: async () => {
			const { error } = await supabase.auth.signOut()
			if (error) {
				console.log(`useSignOut`, error)
				throw error
			}
		},
		onSuccess: async () => {
			client.removeQueries({ queryKey: ['user'], exact: false })
			await clearUser()
			void navigate({ to: '/' })
		},
	})
}
