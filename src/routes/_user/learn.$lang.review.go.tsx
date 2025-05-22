import { createFileRoute, Navigate } from '@tanstack/react-router'

import { FlashCardReviewSession } from '@/components/review/flash-card-review-session'
import { getFromLocalStorage } from '@/lib/use-reviewables'
import { useMemo } from 'react'
import { pids } from '@/types/main'
import { todayString } from '@/lib/utils'

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
	// referential stability for the cache key
	const [dailyCacheKey] = useState(() => [
		'user',
		lang,
		'review',
		todayString(),
	])

	const reviewPids = getFromLocalStorage<pids>(dailyCacheKey)
	if (!reviewPids || !reviewPids.length) return <Navigate to=".." />

	return <FlashCardReviewSession dailyCacheKey={dailyCacheKey} />
}
