import { queryOptions } from '@tanstack/react-query'
import { PublicProfileSchema, MyProfileSchema } from './schemas'
import supabase from '@/lib/supabase-client'

export const publicProfilesQuery = queryOptions({
	queryKey: ['public', 'profiles'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('public_profile')
			.select()
			.throwOnError()
		return data?.map((p) => PublicProfileSchema.parse(p)) ?? []
	},
})

export const myProfileQuery = queryOptions({
	queryKey: ['user', 'profile'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('user_profile')
			.select()
			.throwOnError()
			.maybeSingle()
		if (!data) return []
		return [MyProfileSchema.parse(data)]
	},
})
