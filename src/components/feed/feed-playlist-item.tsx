import type { KeyboardEvent, MouseEvent } from 'react'
import { FeedActivityType } from '@/lib/schemas'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { useOnePlaylist } from '@/hooks/use-playlists'
import { useNavigate } from '@tanstack/react-router'

export function FeedPlaylistItem({ item }: { item: FeedActivityType }) {
	const { data: playlist } = useOnePlaylist(item.id)
	const navigate = useNavigate()

	const handlePlaylistClick = (
		e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
	) => {
		const target = e.target as HTMLElement
		if (!e.currentTarget?.contains(target)) return
		if (target.closest('button, a, input')) return
		void navigate({
			to: '/learn/$lang/playlists/$playlistId',
			params: { lang: item.lang, playlistId: item.id },
		})
	}

	if (!playlist) return null

	return (
		<div
			className="cursor-pointer"
			onClick={handlePlaylistClick}
			onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
				if (e.key === 'Enter') handlePlaylistClick(e)
				else return
			}}
			tabIndex={0}
		>
			<PlaylistItem playlist={playlist} />
		</div>
	)
}
