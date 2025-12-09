import { useMemo } from 'react'
import { useDecks } from '@/hooks/use-deck'
import supabase from './supabase-client'

export function useDeckLangs() {
	const { data } = useDecks()
	return useMemo(() => data?.map((d) => d.lang), [data])
}

export function avatarUrlify(path: string | null | undefined): string {
	return !path ? '' : (
			supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl
		)
}
