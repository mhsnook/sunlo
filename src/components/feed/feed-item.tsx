import { FeedActivityType } from '@/lib/schemas'
import { FeedRequestItem } from './feed-request-item'
import { FeedPlaylistItem } from './feed-playlist-item'
import { FeedPhraseItem } from './feed-phrase-item'
import { FeedPhraseGroupItem } from './feed-phrase-group-item'

type PhraseGroup = {
	type: 'phrase_group'
	items: FeedActivityType[]
	earliest_created_at: string
}

export function FeedItem({ item }: { item: FeedActivityType | PhraseGroup }) {
	if ('earliest_created_at' in item) {
		// For phrase groups, use the max popularity of items in the group
		const maxPopularity = Math.max(...item.items.map((i) => i.popularity))
		return (
			<div
				data-feed-item
				data-popularity={maxPopularity}
				data-name="feed-item-phrase"
			>
				<FeedPhraseGroupItem items={item.items} />
			</div>
		)
	}

	const content = (() => {
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
	})()

	return (
		<div
			data-feed-item
			data-popularity={item.popularity}
			data-name={`feed-item-${item.type}`}
		>
			{content}
		</div>
	)
}
