import { createFileRoute, redirect } from '@tanstack/react-router'
import { FlashCardReviewSession } from '@/components/review/flash-card-review-session'
import { getManifest, useReviewStage } from '@/lib/use-review-store'
import { useState } from 'react'
import { todayString } from '@/lib/utils'
import { DailyCacheKey } from '@/types/main'
import { reviewsQuery } from '@/lib/use-reviews'
import { Loader } from '@/components/ui/loader'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	component: ReviewPage,
	loader: async ({
		params: { lang },
		context: {
			queryClient,
			auth: { userId },
		},
	}) => {
		const dailyCacheKey: DailyCacheKey = ['user', lang, 'review', todayString()]
		const reviews = await queryClient.ensureQueryData(
			reviewsQuery(userId!, dailyCacheKey)
		)
		const manifest = getManifest()
		if (!manifest || !manifest.length) throw redirect({ to: '..' })

		return {
			appnav: [],
			dailyCacheKey,
			manifest,
		}
	},
})

function ReviewPage() {
	const data = Route.useLoaderData()
	// referential stability for the cache key, even if the loader data changes
	const [dailyCacheKey] = useState<DailyCacheKey>(data.dailyCacheKey)
	const reviewStage = useReviewStage()

	if (typeof reviewStage !== 'number' || typeof data.manifest !== 'object')
		return <Loader />
	return (
		<FlashCardReviewSession
			dailyCacheKey={dailyCacheKey}
			manifest={data.manifest}
		/>
	)
}
