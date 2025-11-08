import { useContext, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import supabase from '@/lib/supabase-client'
import { AuthContext } from '@/components/auth-context'
import { useDecks } from '@/hooks/use-deck'
import { cleanupUser } from './collections'

// Access the context's value from inside a provider
export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('You need to wrap AuthProvider.')
	}
	return context
}

export function useUserId(): string
export function useUserId(mode: 'default' | 'strict'): string
export function useUserId(mode: 'relaxed'): string | null
export function useUserId(mode: 'relaxed' | 'default' | 'strict' = 'default') {
	const { userId } = useAuth()
	if (!userId && mode === 'default') {
		console.log(`We expected a userId here... but got ${userId}`)
	}
	if (!userId && mode === 'strict') {
		console.log(`Expected a userId here but got: ${userId}`)
	}
	return userId!
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
			await cleanupUser()
			void navigate({ to: '/' })
		},
	})
}

export function useDeckLangs() {
	const { data } = useDecks()
	return useMemo(() => data?.map((d) => d.lang), [data])
}
