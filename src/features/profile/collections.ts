import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	PublicProfileSchema,
	type PublicProfileType,
	MyProfileSchema,
	type MyProfileType,
} from './schemas'
import { publicProfilesQuery, myProfileQuery } from './queries'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

// Re-export so existing consumers of @/features/profile/collections still work.
export { publicProfilesQuery, myProfileQuery }

export const publicProfilesCollection = createCollection(
	queryCollectionOptions({
		id: 'public_profiles',
		queryKey: publicProfilesQuery.queryKey,
		queryFn: publicProfilesQuery.queryFn!,
		getKey: (item: PublicProfileType) => item.uid,
		queryClient,
		schema: PublicProfileSchema,
	})
)

export const myProfileCollection = createCollection(
	queryCollectionOptions({
		id: 'my_profile',
		queryKey: myProfileQuery.queryKey,
		queryFn: myProfileQuery.queryFn!,
		getKey: (item: MyProfileType) => item.uid,
		queryClient,
		startSync: false,
		schema: MyProfileSchema,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('user_profile')
						.update(m.changes)
						.eq('uid', m.original.uid)
						.throwOnError()
				)
			)
			return { refetch: false }
		},
	})
)
