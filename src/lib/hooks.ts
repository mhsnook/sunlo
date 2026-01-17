import { useDecks } from '@/hooks/use-deck'
import supabase from './supabase-client'

export function useDeckLangs() {
	const { data } = useDecks()
	return data?.map((d) => d.lang)
}

export function avatarUrlify(path: string | null | undefined): string {
	return !path ? '' : (
			supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl
		)
}

// Playlist covers use the same avatars bucket for simplicity
export function playlistCoverUrlify(path: string | null | undefined): string {
	return avatarUrlify(path)
}
