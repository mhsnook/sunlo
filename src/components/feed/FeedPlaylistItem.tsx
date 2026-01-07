import { FeedActivityType } from '@/lib/schemas'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { FeedActivityPayloadPlaylistSchema } from '@/lib/schemas'
import { PhrasePlaylistType } from '@/lib/schemas-playlist'

export function FeedPlaylistItem({ item }: { item: FeedActivityType }) {
	if (item.type !== 'playlist') return null

	const payload = FeedActivityPayloadPlaylistSchema.parse(item.payload)

	// oxlint-disable-next-line jsx-no-new-object-as-prop
	const playlist: PhrasePlaylistType = {
		id: item.id,
		created_at: item.created_at,
		uid: item.uid,
		lang: item.lang,
		title: payload.title,
		description: payload.description,
		phrase_count: payload.phrase_count,
		href: null,
		upvote_count: payload.upvote_count,
	}

	return <PlaylistItem playlist={playlist} />
}
