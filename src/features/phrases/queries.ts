import { queryOptions } from '@tanstack/react-query'
import { PhraseFullSchema } from './schemas'
import supabase from '@/lib/supabase-client'

export const phrasesQuery = queryOptions({
	queryKey: ['public', 'phrase_full'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('phrase_meta')
			.select('*, translations:phrase_translation(*)')
			.throwOnError()
		return data?.map((p) => PhraseFullSchema.parse(p)) ?? []
	},
})
