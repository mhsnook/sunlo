import { queryOptions } from '@tanstack/react-query'
import { DeckMetaRawSchema, CardMetaSchema } from './schemas'
import supabase from '@/lib/supabase-client'
import { sortDecksByCreation } from '@/lib/utils'
import { themes } from '@/lib/deck-themes'
import languages from '@/lib/languages'

export const decksQuery = queryOptions({
	queryKey: ['user', 'deck_plus'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('user_deck_plus')
			.select()
			.throwOnError()
		return (
			data
				?.map((item) => DeckMetaRawSchema.parse(item))
				.toSorted(sortDecksByCreation)
				.map((d, i) =>
					Object.assign(d, {
						theme: i % themes.length,
						language: languages[d.lang],
					})
				) ?? []
		)
	},
})

export const cardsQuery = queryOptions({
	queryKey: ['user', 'card'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('user_card_plus')
			.select()
			.throwOnError()
		return data?.map((item) => CardMetaSchema.parse(item)) ?? []
	},
})
