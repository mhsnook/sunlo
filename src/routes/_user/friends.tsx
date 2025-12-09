import {
	friendSummariesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { TitleBar } from '@/types/main'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/friends')({
	component: FriendsPage,
	loader: async () => {
		await Promise.all([
			friendSummariesCollection.preload(),
			publicProfilesCollection.preload(),
		])
		return {
			titleBar: {
				title: `Friends and Contacts`,
			} as TitleBar,
			appnav: [
				'/friends',
				'/friends/chats',
				'/friends/requests',
				'/friends/invite',
				'/friends/search',
			],
		}
	},
})

function FriendsPage() {
	return <Outlet />
}
