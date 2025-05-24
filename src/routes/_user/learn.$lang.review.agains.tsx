import { createFileRoute, Navigate } from '@tanstack/react-router'
import { FlashCardReviewSession } from '@/components/review/flash-card-review-session'
import {
	getAgainsFromLocalStorage,
	getManifestFromLocalStorage,
} from '@/lib/use-reviewables'
import { useState } from 'react'
import { todayString } from '@/lib/utils'
import { DailyCacheKey } from '@/types/main'

export const Route = createFileRoute('/_user/learn/$lang/review/agains')({
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
	const [dailyCacheKey] = useState<DailyCacheKey>(() => [
		'user',
		lang,
		'review',
		todayString(),
	])

	const reviewPids = getManifestFromLocalStorage(dailyCacheKey)
	if (!reviewPids || !reviewPids.length)
		return <Navigate to="/learn/$lang/review" params={{ lang }} />

	const againPids = getAgainsFromLocalStorage(dailyCacheKey)
	if (!againPids)
		return <Navigate to="/learn/$lang/review/go" params={{ lang }} />

	return (
		<FlashCardReviewSession
			dailyCacheKey={dailyCacheKey}
			loop={true}
			lang={lang}
		/>
	)
}
