import { createFileRoute, redirect } from '@tanstack/react-router'
import { FlashCardReviewSession } from '@/components/review/flash-card-review-session'
import {
	getManifestFromLocalStorage,
	useReviewState,
} from '@/lib/use-reviewables'
import { useState } from 'react'
import { todayString } from '@/lib/utils'
import { DailyCacheKey } from '@/types/main'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	component: ReviewPage,
	loader: ({ params: { lang } }) => {
		const dailyCacheKey: DailyCacheKey = ['user', lang, 'review', todayString()]

		const pidsManifest = getManifestFromLocalStorage(dailyCacheKey)
		if (!pidsManifest || !pidsManifest.length) throw redirect({ to: '..' })

		return {
			appnav: [],
			dailyCacheKey,
			pidsManifest,
		}
	},
})

function ReviewPage() {
	const data = Route.useLoaderData()
	// referential stability for the cache key
	const [dailyCacheKey] = useState<DailyCacheKey>(data.dailyCacheKey)
	const {
		data: { reviewStage },
	} = useReviewState(dailyCacheKey)

	return (
		<FlashCardReviewSession
			dailyCacheKey={dailyCacheKey}
			pidsManifest={data.pidsManifest}
			reviewStage={reviewStage}
		/>
	)
}
