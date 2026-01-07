import { FeedActivityType, PhraseRequestType } from '@/lib/schemas'
import { RequestItem } from '@/components/requests/request-list-item'
import { FeedActivityPayloadRequestSchema } from '@/lib/schemas'

export function FeedRequestItem({ item }: { item: FeedActivityType }) {
	if (item.type !== 'request') return null

	const payload = FeedActivityPayloadRequestSchema.parse(item.payload)

	const request: PhraseRequestType = {
		id: item.id,
		created_at: item.created_at,
		requester_uid: item.uid,
		lang: item.lang,
		prompt: payload.prompt,
		upvote_count: 0, // @TODO: Add upvote count to view if needed
	}

	return (
		<div>
			<p className="text-muted-foreground text-sm">A Request for flashcards</p>
			<RequestItem request={request} />
		</div>
	)
}
