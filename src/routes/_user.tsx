import { useEffect, type ComponentType } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
	createFileRoute,
	Outlet,
	type RouteMatch,
	redirect,
	useMatches,
} from '@tanstack/react-router'

import { TitleBar } from '@/types/main'
import {
	ChatMessageRelative,
	ChatMessageRow,
	FriendRequestActionRow,
} from '@/routes/_user/friends/-types'
import supabase from '@/lib/supabase-client'
import type { ChatsMap } from '@/hooks/use-friends'
import { SidebarInset } from '@/components/ui/sidebar'
import { Loader } from '@/components/ui/loader'
import { AppSidebar } from '@/components/navs/app-sidebar'
import Navbar from '@/components/navs/navbar'
import { AppNav } from '@/components/navs/app-nav'
import { profileQuery } from '@/hooks/use-profile'
import { useAuth } from '@/lib/hooks'

export const Route = createFileRoute('/_user')({
	beforeLoad: ({ context, location }) => {
		// If the user is logged out, redirect them to the login page
		// console.log(`beforeLoad auth context:`, context.auth)
		if (!context.auth?.isAuth) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw redirect({
				to: '/login',
				search: {
					// Use the current location to power a redirect after login
					// (Do not use `router.state.resolvedLocation` as it can
					// potentially lag behind the actual current location)
					redirectedFrom: location.href,
				},
			})
		}
		return context.auth
	},
	loader: async ({
		context: {
			queryClient,
			auth: { userId },
			profile,
		},
		location,
	}) => {
		if (profile === null) {
			const data = await queryClient.ensureQueryData(profileQuery(userId))
			if (location.pathname !== '/getting-started' && data === null) {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw redirect({ to: '/getting-started' })
			}
		}

		return {
			titleBar: {
				title: `Learning Home`,
				subtitle: `Which deck are we studying today?`,
			} as TitleBar,
		}
	},
	component: UserLayout,
	pendingComponent: Loader,
})

type UserLayoutMatch = RouteMatch<
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown
> & {
	loaderData?: {
		SecondSidebar?: ComponentType
	}
}

function UserLayout() {
	const matches = useMatches()
	const matchWithSidebar = matches.findLast(
		(m) => !!(m as UserLayoutMatch)?.loaderData?.SecondSidebar
	) as UserLayoutMatch | undefined
	const SecondSidebar = matchWithSidebar?.loaderData?.SecondSidebar
	const sidebarExact =
		matchWithSidebar && matchWithSidebar.id === matches.at(-1)?.id.slice(0, -1)
	const queryClient = useQueryClient()
	const { userId } = useAuth()
	useEffect(() => {
		if (!userId) return
		const friendRequestChannel = supabase
			.channel('friend-request-action-realtime')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'friend_request_action',
				},
				(payload) => {
					const newAction = payload.new as FriendRequestActionRow
					if (
						newAction.action_type === 'accept' &&
						newAction.uid_for === userId
					)
						toast.success('Friend request accepted')
					if (newAction.action_type === 'accept' && newAction.uid_by === userId)
						toast.success('You are now connected')
					// console.log(`new friend request action has come in`, payload)
					void queryClient.invalidateQueries({
						queryKey: ['user', userId, 'relations'],
					})
				}
			)
			.subscribe()

		const chatChannel = supabase
			.channel('user-chats')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'chat_message',
				},
				(payload) => {
					const newMessage = payload.new as ChatMessageRow

					queryClient.setQueryData(
						['user', userId, 'chats'],
						(oldData: ChatsMap | undefined): ChatsMap => {
							const friendId =
								newMessage.sender_uid === userId ?
									newMessage.recipient_uid
								:	newMessage.sender_uid

							const newChatMessageRelative: ChatMessageRelative = {
								...newMessage,
								isMine: newMessage.sender_uid === userId,
								friendId: friendId,
							}

							const currentChats = oldData ?? {}
							const friendChatHistory = currentChats[friendId] ?? []

							return {
								...currentChats,
								[friendId]: [...friendChatHistory, newChatMessageRelative],
							}
						}
					)
				}
			)
			.subscribe()

		return () => {
			void supabase.removeChannel(friendRequestChannel)
			void supabase.removeChannel(chatChannel)
		}
	}, [userId, queryClient])

	return (
		<div className="flex h-screen w-full">
			<AppSidebar />
			<SidebarInset className="@container w-full flex-1 flex-col">
				<Navbar />
				<AppNav />
				<div className="flex flex-1 flex-row gap-2 px-2">
					{SecondSidebar ?
						<div
							className={`${sidebarExact ? 'flex w-full' : 'hidden'} my-2 @xl:flex @xl:w-80`}
						>
							<SecondSidebar />
						</div>
					:	null}

					<div
						id="app-sidebar-layout-outlet"
						className={`${sidebarExact ? 'hidden' : 'w-full'} @xl:w-app @container my-2 @xl:block`}
					>
						<Outlet />
					</div>
				</div>
			</SidebarInset>
		</div>
	)
}
