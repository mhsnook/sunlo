import { createFileRoute } from '@tanstack/react-router'
import { cardReviewsQuery, reviewDaysQuery } from '@/features/review/queries'
import { queryClient } from '@/lib/query-client'
import { todayString } from '@/lib/utils'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	beforeLoad: () => ({
		contextMenu: [],
		focusMode: true,
		fixedHeight: true,
	}),
	loader: async ({ context, params }) => {
		if (!context.auth.isAuth) return
		await Promise.all([
			queryClient.ensureQueryData(reviewDaysQuery),
			queryClient.ensureQueryData(cardReviewsQuery),
		])
		// Dynamic import keeps @tanstack/db out of the eager bundle.
		const { ensureManifestCardsInCollection } =
			await import('@/features/review/hooks')
		await ensureManifestCardsInCollection(params.lang, todayString())
	},
})
