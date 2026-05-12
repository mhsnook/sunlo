import { createLazyFileRoute, Navigate } from '@tanstack/react-router'
import {
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from '@/features/review/store'
import { useReviewDay } from '@/features/review/hooks'
import { Loader } from '@/components/ui/loader'
import { NewCardsPreview } from '@/components/review/new-cards-preview'

export const Route = createLazyFileRoute('/_user/learn/$lang/review/preview')({
	component: PreviewPage,
})

function PreviewPage() {
	const { lang } = Route.useParams()
	const reviewLang = useReviewLang()
	const dayString = useReviewDayString()
	const { data: day, isLoading } = useReviewDay(reviewLang, dayString)
	const stage = useReviewStage()

	if (isLoading) return <Loader />
	if (!day?.manifest?.length || stage === null)
		return <Navigate to="/learn/$lang/review" params={{ lang }} />

	return (
		<main data-testid="review-preview-page">
			<NewCardsPreview manifest={day.manifest} />
		</main>
	)
}
