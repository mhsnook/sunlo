import { FeedActivityType, PhraseRequestType } from '@/lib/schemas'
import { RequestItem } from '@/components/requests/request-list-item'
import { FeedActivityPayloadRequestSchema } from '@/lib/schemas'

export function FeedRequestItem({ item }: { item: FeedActivityType }) {
	if (item.type !== 'request') return null

	const payload = FeedActivityPayloadRequestSchema.parse(item.payload)

	// oxlint-disable-next-line jsx-no-new-object-as-prop
	const request: PhraseRequestType = {
		id: item.id,
		created_at: item.created_at,
		requester_uid: item.uid,
		lang: item.lang,
		prompt: payload.prompt,
		upvote_count: payload.upvote_count,
	}

	return <RequestItem request={request} />
}
