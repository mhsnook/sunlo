import { TitleBar } from '@/types/main'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { relationsQuery } from '@/hooks/use-friends'

export const Route = createFileRoute('/_user/friends')({
	component: FriendsPage,
	loader: async ({ context }) => {
		const { queryClient, userId } = context
		await queryClient.ensureQueryData(relationsQuery(userId))
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
