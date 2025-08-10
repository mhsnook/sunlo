import { useEffect, type ComponentType } from 'react'
import { SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/navs/app-sidebar'
import Navbar from '@/components/navs/navbar'
import { AppNav } from '@/components/navs/app-nav'
import { profileQuery } from '@/lib/use-profile'
import { FriendRequestActionRow, TitleBar } from '@/types/main'
import {
	createFileRoute,
	Outlet,
	type RouteMatch,
	redirect,
	useMatches,
} from '@tanstack/react-router'
import { Home } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks'
import supabase from '@/lib/supabase-client'
import toast from 'react-hot-toast'

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
		},
		location,
	}) => {
		// if for some reason there is no profile, we must create one!
		if (location.pathname !== '/getting-started') {
			const data = await queryClient.ensureQueryData({
				...profileQuery(userId),
			})
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			if (data === null) throw redirect({ to: '/getting-started' })
		}

		return {
			titleBar: {
				title: `Learning Home`,
				subtitle: `Which deck are we studying today?`,
				Icon: Home,
			} as TitleBar,
		}
	},
	component: UserLayout,
	pendingComponent: Loader,
})

type UserLayoutMatch = RouteMatch & {
	loaderData?: {
		SecondSidebar?: ComponentType
	}
}

function UserLayout() {
	const matches = useMatches() as UserLayoutMatch[]
	const match = matches.findLast((m) => !!m.loaderData?.SecondSidebar)
	const SecondSidebar = match?.loaderData?.SecondSidebar
	const sidebarExact = match?.id === matches.at(-1).id.slice(0, -1)
	// console.log(matches, matches.at(-1), match, sidebarExact)

	const queryClient = useQueryClient()
	const { userId } = useAuth()
	useEffect(() => {
		if (!userId) return
		const channel = supabase
			.channel('friend-request-action-realtime')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'friend_request_action',
					filter: `uid_for=eq.${userId}`,
				},
				(payload) => {
					const newAction = payload.new as FriendRequestActionRow
					if (newAction.action_type === 'accept')
						toast.success('Friend request accepted')
					// console.log(`new friend request action has come in`, payload)
					void queryClient.invalidateQueries({
						queryKey: ['user', userId, 'relations'],
					})
				}
			)
			.subscribe()
		return () => {
			void supabase.removeChannel(channel)
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
