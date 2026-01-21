import { createFileRoute, Outlet, useMatch } from '@tanstack/react-router'
import { ChatsSidebar } from './-chats-sidebar'
import { chatMessagesCollection } from '@/lib/collections'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_user/friends/chats')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Chats',
		},
	}),
	loader: async ({ context }) => {
		// Only preload if authenticated to ensure RLS works correctly
		if (context.auth.isAuth) {
			await chatMessagesCollection.preload()
		}
	},
	component: ChatsLayout,
})

function ChatsLayout() {
	// Check if we're on the index route (no specific chat selected)
	const indexMatch = useMatch({
		from: '/_user/friends/chats/',
		shouldThrow: false,
	})
	const isOnIndex = !!indexMatch

	return (
		<div className="flex h-full min-h-0 flex-1 flex-row gap-2">
			{/* Sidebar: full width on small screens when on index, fixed width on large screens */}
			<div
				className={cn(
					'min-h-0',
					isOnIndex ? 'flex w-full @xl:w-80' : 'hidden @xl:flex @xl:w-80'
				)}
				style={{ viewTransitionName: 'second-sidebar' }}
			>
				<ChatsSidebar />
			</div>

			{/* Outlet: hidden on small screens when on index, visible otherwise */}
			<div
				className={cn(
					'@container min-h-0',
					isOnIndex ? '@xl:w-app hidden @xl:block' : '@xl:w-app w-full'
				)}
				style={{ viewTransitionName: 'main-content' }}
			>
				<Outlet />
			</div>
		</div>
	)
}
