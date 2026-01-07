import { FeedActivityType } from '@/lib/schemas'
import { RequestItem } from '@/components/requests/request-list-item'

import { useRequest } from '@/hooks/use-requests'

export function FeedRequestItem({ item }: { item: FeedActivityType }) {
	const { data: request } = useRequest(item.id)
	if (!request) return null

	return <RequestItem request={request} />
}
