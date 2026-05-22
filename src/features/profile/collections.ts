import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryOptions } from '@tanstack/react-query'
import { BasicIndex } from '@tanstack/db'
import {
	PublicProfileSchema,
	type PublicProfileType,
	MyProfileSchema,
	type MyProfileType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import type { TablesUpdate } from '@/types/supabase'

export const publicProfilesCollection = createCollection(
	queryCollectionOptions({
		id: 'public_profiles',
		queryKey: ['public', 'profiles'],
		queryFn: async () => {
			console.log(`Loading publicProfilesCollection`)
			const { data } = await supabase
				.from('public_profile')
				.select()
				.throwOnError()
			return data?.map((p) => PublicProfileSchema.parse(p)) ?? []
		},
		getKey: (item: PublicProfileType) => item.uid,
		queryClient,
		schema: PublicProfileSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const myProfileQuery = queryOptions({
	queryKey: ['user', 'profile'],
	queryFn: async (_) => {
		console.log(`Running myProfileQuery`)
		const { data } = await supabase
			.from('user_profile')
			.select()
			.throwOnError()
			.maybeSingle()
		if (!data) return []
		return [MyProfileSchema.parse(data)]
	},
})

export const myProfileCollection = createCollection(
	queryCollectionOptions({
		id: 'my_profile',
		queryKey: myProfileQuery.queryKey,
		queryFn: async (args) => {
			console.log(`Loading myProfileCollection`)
			return myProfileQuery.queryFn!(args)
		},
		getKey: (item: MyProfileType) => item.uid,
		queryClient,
		startSync: false,
		schema: MyProfileSchema,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('user_profile')
						.update(m.changes as TablesUpdate<'user_profile'>)
						.eq('uid', m.original.uid)
						.throwOnError()
				)
			)
			// Refetch so the query cache holds the server's post-update row.
			// With { refetch: false } the cache keeps the stale pre-update
			// value; only the optimistic overlay carries the change. If the
			// collection is later torn down and re-synced (GC, navigation
			// churn), preload() rehydrates from that stale cache — staleTime
			// + refetchOnMount: false mean it won't re-fetch — and the change
			// silently disappears (e.g. the onboarding nudge reappearing).
			return { refetch: true }
		},
	})
)
