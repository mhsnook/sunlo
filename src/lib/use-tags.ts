import { queryOptions, useQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { Tag } from '@/types/main'

export const languageTagsQueryOptions = (lang: string) =>
	queryOptions({
		queryKey: ['tags', lang],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('tag')
				.select('id, name')
				.eq('lang', lang)
				.order('name', { ascending: true })
			if (error) throw error
			return data as Tag[]
		},
		enabled: !!lang,
	})

export const useLanguageTags = (lang: string) => {
	return useQuery(languageTagsQueryOptions(lang))
}
