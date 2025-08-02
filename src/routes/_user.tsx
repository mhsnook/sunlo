import { SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/navs/app-sidebar'
import Navbar from '@/components/navs/navbar'
import { AppNav } from '@/components/navs/app-nav'
import { profileQuery } from '@/lib/use-profile'
import { TitleBar } from '@/types/main'
import {
	createFileRoute,
	Outlet,
	redirect,
	useMatches,
} from '@tanstack/react-router'
import { Home } from 'lucide-react'
import { Loader } from '@/components/ui/loader'

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

function UserLayout() {
	const matches = useMatches()
	const match = matches.findLast((m) => !!m?.loaderData?.SecondSidebar)
	const SecondSidebar = match?.loaderData?.SecondSidebar
	return (
		<div className="flex h-screen w-full">
			<AppSidebar />
			<SidebarInset className="w-full flex-1 flex-col">
				<Navbar />
				<AppNav />
				<div className="flex flex-row gap-2">
					{SecondSidebar ?
						<SecondSidebar />
					:	null}
					<div
						id="app-sidebar-layout-outlet"
						className="w-app @container pe-2 pb-6"
					>
						<Outlet />
					</div>
				</div>
			</SidebarInset>
		</div>
	)
}
