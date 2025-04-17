import { createFileRoute, Outlet } from '@tanstack/react-router'
import { TitleBar } from '@/types/main'
import languages from '@/lib/languages'
import { languageQueryOptions } from '@/lib/use-language'
import { deckQueryOptions } from '@/lib/use-deck'
import { BookHeart } from 'lucide-react'
import { reviewablesQueryOptions } from '@/lib/use-reviewables'

export const Route = createFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
	loader: async ({
		params: { lang },
		context: {
			queryClient,
			auth: { userId },
		},
	}) => {
		const languageLoader = queryClient.ensureQueryData(
			languageQueryOptions(lang)
		)
		const deckLoader = queryClient.ensureQueryData(
			deckQueryOptions(lang, userId!)
		)
		const reviewablesLoader = queryClient.ensureQueryData(
			reviewablesQueryOptions(lang, userId!)
		)
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const data = {
			language: await languageLoader,
			deck: await deckLoader,
			reviewableCards: await reviewablesLoader,
		}
		return {
			language: data.language,
			deck: data.deck,
			reviewableCards: data.reviewableCards.map(
				(r) => data.deck.cardsMap[r.phrase_id!]
			),
			appnav: [
				'/learn/$lang',
				'/learn/$lang/review',
				'/learn/$lang/library',
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
			],
			contextMenu: [
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
				'/learn/$lang/deck-settings',
			],
			titleBar: {
				title: `${languages[lang]} Deck`,
				Icon: BookHeart,
			} as TitleBar,
		}
	},
})

function LanguageLayout() {
	return <Outlet />
}
