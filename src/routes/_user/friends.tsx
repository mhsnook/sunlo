import { createFileRoute, Outlet } from '@tanstack/react-router'
import { publicProfilesCollection } from '@/features/profile/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { RequireAuth } from '@/components/require-auth'

export const Route = createFileRoute('/_user/friends')({
	staticData: {
		search: 'profiles',
		contextMenu: ['/friends/chats', '/friends/invite'],
		titleBar: { title: 'Friends and Contacts' },
	},
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
