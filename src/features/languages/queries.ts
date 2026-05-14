import { queryOptions } from '@tanstack/react-query'
import { LanguageSchema, LangTagSchema } from './schemas'
import supabase from '@/lib/supabase-client'

export const languagesQuery = queryOptions({
	queryKey: ['public', 'meta_language'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('meta_language')
			.select()
			.is('alias_of', null)
			.throwOnError()
		return data?.map((item) => LanguageSchema.parse(item)) ?? []
	},
})

export const langTagsQuery = queryOptions({
	queryKey: ['public', 'lang_tag'] as const,
	queryFn: async () => {
		const { data } = await supabase.from('tag').select().throwOnError()
		return data?.map((p) => LangTagSchema.parse(p)) ?? []
	},
})
