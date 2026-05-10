import { FeedActivityType } from '@/features/feed/schemas'
import { RequestItem } from '@/components/requests/request-list-item'

import { useRequest } from '@/features/requests/hooks'

export function FeedRequestItem({ item }: { item: FeedActivityType }) {
	const { data: request } = useRequest(item.id)
	if (!request) return null

	return <RequestItem request={request} />
}
