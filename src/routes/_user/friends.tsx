import {
	friendSummariesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/friends')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Friends and Contacts',
		},
		appnav: [
			'/friends',
			'/friends/chats',
			'/friends/requests',
			'/friends/invite',
			'/friends/search',
		],
	}),
	loader: async () => {
		await Promise.all([
			friendSummariesCollection.preload(),
			publicProfilesCollection.preload(),
		])
	},
})
