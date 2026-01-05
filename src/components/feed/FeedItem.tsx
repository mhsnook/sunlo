import { FeedActivityType } from '@/lib/schemas'
import { FeedRequestItem } from './FeedRequestItem'
import { FeedPlaylistItem } from './FeedPlaylistItem'
import { FeedPhraseItem } from './FeedPhraseItem'

export function FeedItem({ item }: { item: FeedActivityType }) {
	switch (item.type) {
		case 'request':
			return <FeedRequestItem item={item} />
		case 'playlist':
			return <FeedPlaylistItem item={item} />
		case 'phrase':
			return <FeedPhraseItem item={item} />
		default:
			return null
	}
}
