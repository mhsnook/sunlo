import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import supabase from '@/lib/supabase-client'

import { clearUser } from '@/lib/collections'
import { useDecks } from '@/hooks/use-deck'

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

export function useDeckLangs() {
	const { data } = useDecks()
	return useMemo(() => data?.map((d) => d.lang), [data])
}
