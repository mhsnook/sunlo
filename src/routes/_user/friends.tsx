import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { publicProfilesQuery } from '@/features/profile/queries'
import { friendSummariesQuery } from '@/features/social/queries'
import { queryClient } from '@/lib/query-client'

const FriendsSearchParams = z.object({
	search: z.boolean().optional(),
})

export const Route = createFileRoute('/_user/friends')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Friends and Contacts',
		},
		searchAction: true,
		contextMenu: ['/friends/chats', '/friends/invite'],
	}),
	validateSearch: FriendsSearchParams,
	loader: async ({ context }) => {
		// Only preload if authenticated
		if (!context.auth.isAuth) return
		await Promise.all([
			queryClient.ensureQueryData(friendSummariesQuery),
			queryClient.ensureQueryData(publicProfilesQuery),
		])
	},
})
