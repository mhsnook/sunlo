import { createFileRoute } from '@tanstack/react-router'
import { FlashCardReviewSession } from '@/components/review/flash-card-review-session'
import { useManifest, useReviewStage } from '@/lib/use-review-store'
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

		return {
			appnav: [],
			dailyCacheKey,
		}
	},
})

function ReviewPage() {
	const reviewStage = useReviewStage()
	const manifest = useManifest()

	if (typeof reviewStage !== 'number' || typeof manifest !== 'object')
		return <Loader />
	return <FlashCardReviewSession />
}
