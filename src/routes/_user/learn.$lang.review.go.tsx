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
	loaderDeps: () => ({}),
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const dayString = todayString()

	const reviewData = useMemo(() => {
		const dailyCacheKey = ['user', lang, 'review', dayString]
		return { dailyCacheKey, pids: getFromLocalStorage<pids>(dailyCacheKey) }
	}, [lang, dayString])

	if (!reviewData.pids || !reviewData.pids.length) return <Navigate to=".." />

	return (
		<FlashCardReviewSession
			dailyCacheKey={reviewData.dailyCacheKey}
			pids={reviewData.pids}
			// lang={lang}
		/>
	)
}
