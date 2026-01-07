import { type KeyboardEvent, type MouseEvent, useCallback } from 'react'
import { FeedActivityType } from '@/lib/schemas'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { useOnePlaylist } from '@/hooks/use-playlists'
import { useNavigate } from '@tanstack/react-router'

export function FeedPlaylistItem({ item }: { item: FeedActivityType }) {
	const { data: playlist } = useOnePlaylist(item.id)
	const navigate = useNavigate()

	const handlePlaylistClick = useCallback(
		(e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
			const target = e.target as HTMLElement
			if (!e.currentTarget?.contains(target)) return
			if (target.closest('button, a, input')) return
			void navigate({
				to: '/learn/$lang/playlists/$playlistId',
				params: { lang: item.lang, playlistId: item.id },
			})
		},
		[navigate, item]
	)

	if (!playlist) return null

	return (
		<div
			className="cursor-pointer"
			// oxlint-disable-next-line jsx-no-new-function-as-prop
			onClick={handlePlaylistClick}
			// oxlint-disable-next-line jsx-no-new-function-as-prop
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
