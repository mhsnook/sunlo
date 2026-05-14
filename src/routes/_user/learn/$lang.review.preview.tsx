import { createFileRoute } from '@tanstack/react-router'
import { cardReviewsQuery, reviewDaysQuery } from '@/features/review/queries'
import { queryClient } from '@/lib/query-client'
import { todayString } from '@/lib/utils'

export const Route = createFileRoute('/_user/learn/$lang/review/preview')({
	beforeLoad: () => ({
		contextMenu: [],
		focusMode: true,
	}),
	loader: async ({ context, params }) => {
		if (!context.auth.isAuth) return
		await Promise.all([
			queryClient.ensureQueryData(reviewDaysQuery),
			queryClient.ensureQueryData(cardReviewsQuery),
		])
		const { ensureManifestCardsInCollection } =
			await import('@/features/review/hooks')
		await ensureManifestCardsInCollection(params.lang, todayString())
	},
})
