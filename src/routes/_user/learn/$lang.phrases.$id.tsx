import { createFileRoute } from '@tanstack/react-router'
import { phrasesQuery } from '@/features/phrases/queries'
import { cardsQuery } from '@/features/deck/queries'
import { publicProfilesQuery } from '@/features/profile/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/learn/$lang/phrases/$id')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Phrase',
		},
	}),
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			queryClient.ensureQueryData(phrasesQuery),
			queryClient.ensureQueryData(publicProfilesQuery),
		]
		if (context.auth.isAuth) {
			preloads.push(queryClient.ensureQueryData(cardsQuery))
		}
		await Promise.all(preloads)
	},
})
