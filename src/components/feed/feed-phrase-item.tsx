import { FeedActivityType } from '@/features/feed/schemas'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { usePhrase } from '@/hooks/composite-phrase'
import { PhraseSummaryLine } from './feed-phrase-group-item'

export function FeedPhraseItem({ item }: { item: FeedActivityType }) {
	const { data: phrase } = usePhrase(item.id)
	if (item.type !== 'phrase' || !phrase) return null

	return (
		<div className="text-muted-foreground flex flex-col gap-1 px-2 py-2 text-sm">
			<div className="flex flex-col gap-2">
				<UidPermalinkInline
					uid={item.uid}
					action="added"
					timeValue={item.created_at}
					timeLinkTo="/learn/$lang/phrases/$id"
					timeLinkParams={{ lang: item.lang, id: item.public_id }}
				/>
				<div className="bg-background flex flex-row items-center gap-2 rounded-lg p-3">
					<PhraseSummaryLine item={item} />
				</div>
			</div>
		</div>
	)
}
