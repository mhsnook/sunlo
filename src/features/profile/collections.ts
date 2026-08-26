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
import { rowMatches, writeSyncedRow } from '@/lib/collections/synced-row'
import { should } from '@scenetest/checks/react'
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
		// Identity-aware: no session → [] without a DB hit; with a session,
		// query the row explicitly. Disambiguates "empty because logged out"
		// from "empty because RLS filtered" so a sync that ran without auth
		// can't masquerade as an authoritative empty result.
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (!session) return []
		const { data } = await supabase
			.from('user_profile')
			.select()
			.eq('uid', session.user.id)
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
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'user_profile'>
					const { data } = await supabase
						.from('user_profile')
						.update(changes)
						.eq('uid', m.original.uid)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`user_profile ${m.original.uid} server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					if (row)
						writeSyncedRow(myProfileCollection, MyProfileSchema.parse(row))
				})
			)
			return { refetch: false }
		},
	})
)
