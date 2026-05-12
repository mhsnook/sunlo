import { createFileRoute } from '@tanstack/react-router'
import { ensureManifestCardsInCollection } from '@/features/review/hooks'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'
import { todayString } from '@/lib/utils'

export const Route = createFileRoute('/_user/learn/$lang/review/preview')({
	beforeLoad: () => ({
		contextMenu: [],
		focusMode: true,
	}),
	loader: async ({ context, params }) => {
		if (!context.auth.isAuth) return
		await Promise.all([
			reviewDaysCollection.preload(),
			cardReviewsCollection.preload(),
		])
		await ensureManifestCardsInCollection(params.lang, todayString())
	},
})
