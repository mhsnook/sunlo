import { createFileRoute, Navigate } from '@tanstack/react-router'
import {
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from '@/features/review/store'
import { useReviewDay } from '@/features/review/hooks'
import { Loader } from '@/components/ui/loader'
import { NewCardsPreview } from '@/components/review/new-cards-preview'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'

export const Route = createFileRoute('/_user/learn/$lang/review/preview')({
	beforeLoad: () => ({
		contextMenu: [],
		focusMode: true,
	}),
	component: PreviewPage,
	loader: async () => {
		await Promise.all([
			reviewDaysCollection.preload(),
			cardReviewsCollection.preload(),
		])
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
