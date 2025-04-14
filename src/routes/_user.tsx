import { AppSidebarLayout } from '@/components/app-sidebar-layout'
import Navbar from '@/components/navbar'
import { AppNav } from '@/components/app-nav'
import { profileQuery } from '@/lib/use-profile'
import { TitleBar } from '@/types/main'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Home } from 'lucide-react'

export const Route = createFileRoute('/_user')({
	beforeLoad: ({ context, location }) => {
		// If the user is logged out, redirect them to the login page
		// console.log(`beforeLoad auth context:`, context.auth)
		if (!context.auth?.isAuth) {
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
			const data = await queryClient.fetchQuery(profileQuery(userId))
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
})

function UserLayout() {
	return (
		<AppSidebarLayout>
			<Navbar />
			<AppNav />
			<Outlet />
		</AppSidebarLayout>
	)
}
