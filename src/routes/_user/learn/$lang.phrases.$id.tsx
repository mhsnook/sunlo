import { createFileRoute } from '@tanstack/react-router'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection } from '@/features/deck/collections'
import { publicProfilesCollection } from '@/features/profile/collections'

export const Route = createFileRoute('/_user/learn/$lang/phrases/$id')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Phrase',
		},
	}),
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			phrasesCollection.preload(),
			publicProfilesCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(cardsCollection.preload())
		}
		await Promise.all(preloads)
	},
})
