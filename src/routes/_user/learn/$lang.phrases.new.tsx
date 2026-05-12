import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { cardsCollection } from '@/features/deck/collections'

export interface SearchParams {
	text?: string
}

export const Route = createFileRoute('/_user/learn/$lang/phrases/new')({
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		return {
			text: (search?.text as string) ?? '',
		}
	},
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Add ${languages[lang]} Phrase`,
		},
	}),
	loader: async ({ context }) => {
		if (context.auth.isAuth) {
			await cardsCollection.preload()
		}
	},
})
