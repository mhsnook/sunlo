import {
	friendSummariesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/friends')({
	component: FriendsPage,
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

function FriendsPage() {
	return <Outlet />
}
