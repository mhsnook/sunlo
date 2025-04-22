import { createFileRoute, Navigate } from '@tanstack/react-router'

import { FlashCardReviewSession } from '@/components/flash-card-review-session'
import { useQuery } from '@tanstack/react-query'
import {
	getIndexOfFirstUnreviewedCard,
	todaysReviewLocalStorageQueryOptions,
} from '@/lib/use-reviewables'

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
	if (!pids || !pids.length) return <Navigate to=".." />

	// checks if we already have some reviews in localStorage
	const startWith = getIndexOfFirstUnreviewedCard(pids, [
		'user',
		lang,
		'review',
		dayString,
	])

	return (
		<FlashCardReviewSession startWith={startWith} pids={pids} lang={lang} />
	)
}
