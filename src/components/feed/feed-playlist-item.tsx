import { FeedActivityType } from '@/lib/schemas'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { useOnePlaylist } from '@/hooks/use-playlists'

export function FeedPlaylistItem({ item }: { item: FeedActivityType }) {
	const { data: playlist } = useOnePlaylist(item.id)
	if (!playlist) return null

	return <PlaylistItem playlist={playlist} />
}
