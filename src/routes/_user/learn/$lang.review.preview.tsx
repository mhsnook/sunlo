import { createFileRoute, Navigate } from '@tanstack/react-router'
import {
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from '@/hooks/use-review-store'
import { useReviewDay } from '@/hooks/use-reviews'
import { Loader } from '@/components/ui/loader'
import { NewCardsPreview } from '@/components/review/new-cards-preview'
import { cardReviewsCollection, reviewDaysCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/learn/$lang/review/preview')({
	beforeLoad: () => ({
		contextMenu: [],
		focusMode: true,
	}),
	component: PreviewPage,
	loader: async () => {
		const daysLoaded = reviewDaysCollection.preload()
		const reviewsLoaded = cardReviewsCollection.preload()
		await Promise.all([daysLoaded, reviewsLoaded])
	},
})

function PreviewPage() {
	const { lang } = Route.useParams()
	const reviewLang = useReviewLang()
	const dayString = useReviewDayString()
	const { data: day, isLoading } = useReviewDay(reviewLang, dayString)
	const stage = useReviewStage()

	if (isLoading) return <Loader />
	if (!day?.manifest?.length || stage === null)
		return (
			<Navigate
				to="/learn/$lang/review"
				params={{ lang }}
				from={Route.fullPath}
			/>
		)

	return <NewCardsPreview manifest={day.manifest} />
}
