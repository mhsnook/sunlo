import { Suspense } from 'react'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { getSession, isAdminQuery } from '~/lib/session'
import { useCrewLive } from '~/lib/crew'
import { CrewSidebar } from '~/components/crew/crew-sidebar'
import { MeetingBanner } from '~/components/crew/meeting-banner'

export const Route = createFileRoute('/_admin')({
	beforeLoad: async ({ context }) => {
		const session = await getSession()
		if (!session) throw redirect({ to: '/login' })
		const isAdmin = await context.queryClient.ensureQueryData(
			isAdminQuery(session.user.id)
		)
		return { session, isAdmin }
	},
	component: AdminLayout,
})

function AdminLayout() {
	const { isAdmin } = Route.useRouteContext()
	return isAdmin ? <CrewLayout /> : <NotAdmin />
}

function CrewLayout() {
	return (
		<div className="flex h-dvh">
			{/* useAgent suspends while it refreshes the token for its socket,
			    every cacheTtl; outside this boundary that blanks the page. */}
			<Suspense fallback={null}>
				<CrewLive />
			</Suspense>
			<aside className="hidden w-72 shrink-0 border-e bg-neutral-50 md:block">
				<CrewSidebar />
			</aside>
			<main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
				<MeetingBanner />
				<Outlet />
			</main>
		</div>
	)
}

function CrewLive() {
	useCrewLive()
	return null
}

function NotAdmin() {
	return (
		<div className="mx-auto max-w-md space-y-4 px-4 pt-[10dvh] text-center">
			<h1 className="text-xl font-semibold">This account is not an admin</h1>
			<p className="text-muted-foreground">
				Sign out and sign in with an admin account, or ask an existing admin to
				add this account to the admin_user table.
			</p>
			<Button variant="neutral" onClick={() => void supabase.auth.signOut()}>
				Sign out
			</Button>
		</div>
	)
}
