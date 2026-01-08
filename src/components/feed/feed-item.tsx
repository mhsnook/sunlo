import { FeedActivityType } from '@/lib/schemas'
import { FeedRequestItem } from './feed-request-item'
import { FeedPlaylistItem } from './feed-playlist-item'
import { FeedPhraseItem } from './feed-phrase-item'
import { FeedPhraseGroupItem } from './feed-phrase-group-item'

export function FeedItem({
	item,
}: {
	item: FeedActivityType | { type: 'phrase_group'; items: FeedActivityType[] }
}) {
	if ('type' in item && item.type === 'phrase_group') {
		return <FeedPhraseGroupItem items={item.items} />
	}

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
