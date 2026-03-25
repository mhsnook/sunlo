import { useDecks } from '@/features/deck/hooks'
import supabase from './supabase-client'

export function useDeckLangs() {
	const { data } = useDecks()
	return data?.map((d) => d.lang)
}

export function avatarUrlify(
	path: string | null | undefined,
	size: number = 48
): string {
	if (!path) return ''
	const px = size * 2
	const transform = { width: px, height: px }
	return supabase.storage.from('avatars').getPublicUrl(path, { transform }).data
		?.publicUrl
}

// Playlist covers use the same avatars bucket for simplicity
export function playlistCoverUrlify(
	path: string | null | undefined,
	size?: number
): string {
	return avatarUrlify(path, size)
}
