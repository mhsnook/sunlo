import { createFileRoute, Outlet } from '@tanstack/react-router'
import { TitleBar } from '@/types/main'
import languages from '@/lib/languages'
import { languageQueryOptions } from '@/hooks/use-language'
import { deckQueryOptions } from '@/hooks/use-deck'
import supabase from '@/lib/supabase-client'

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
			deckQueryOptions(lang, userId)
		)

		const data = {
			language: await languageLoader,
			deck: await deckLoader,
		}
		return {
			language: data.language,
			deck: data.deck,
			appnav: [
				'/learn/$lang',
				'/learn/$lang/review',
				'/learn/$lang/library',
				'/learn/$lang/requests',
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
			],
			contextMenu: [
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
				'/learn/$lang/deck-settings',
			],
			quickSearch: {
				labelText: 'Search for a phrase',
				searchFn: async ({ query }: { query: string }) => {
					console.log(`query`, typeof query, query)
					const { data } = await supabase
						.from('meta_phrase_info')
						.select()
						.ilikeAnyOf('text', String(query).split(' '))
						.throwOnError()
					return data.map((phrase) => {
						return {
							title: phrase.text,
							description: '',
							link: {
								to: '/learn/$lang/$id',
								params: { id: phrase.id, lang: phrase.lang },
							},
						}
					})
				},
			},
			titleBar: {
				title: `${languages[lang]} Deck`,
			} as TitleBar,
		}
	},
})

function LanguageLayout() {
	return <Outlet />
}
