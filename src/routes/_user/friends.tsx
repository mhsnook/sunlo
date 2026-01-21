import {
	friendSummariesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RequireAuth } from '@/components/require-auth'

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
	loader: async ({ context }) => {
		// Only preload if authenticated
		if (!context.auth.isAuth) return
		await Promise.all([
			friendSummariesCollection.preload(),
			publicProfilesCollection.preload(),
		])
	},
	component: FriendsLayout,
})

function FriendsLayout() {
	return (
		<RequireAuth message="Log in to connect with friends, share phrases, and chat.">
			<Outlet />
		</RequireAuth>
	)
}
