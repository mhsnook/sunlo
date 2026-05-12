import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { publicProfilesCollection } from '@/features/profile/collections'
import { friendSummariesCollection } from '@/features/social/collections'

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
			friendSummariesCollection.preload(),
			publicProfilesCollection.preload(),
		])
	},
})
