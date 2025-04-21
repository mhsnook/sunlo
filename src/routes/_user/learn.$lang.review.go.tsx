import { createFileRoute, Navigate } from '@tanstack/react-router'

import { FlashCardReviewSession } from '@/components/flash-card-review-session'
import { useQuery } from '@tanstack/react-query'
import { todaysReviewLocalStorageQueryOptions } from '@/lib/use-reviewables'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	component: ReviewPage,
	loader: () => {
		return {
			appnav: [],
		}
	},
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const { dayString } = Route.useRouteContext()
	const { data: pids } = useQuery(
		todaysReviewLocalStorageQueryOptions(lang, dayString)
	)

	return !pids || !pids.length ?
			<Navigate to=".." />
		:	<FlashCardReviewSession pids={pids} lang={lang} />
}
