import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { getSession, isAdminQuery } from '~/lib/session'

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
	const { session, isAdmin } = Route.useRouteContext()
	return (
		<>
			<header className="bg-card border-b">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
					<span className="font-semibold">Sunlo Admin</span>
					<div className="flex min-w-0 items-center gap-3 text-sm">
						<span className="text-muted-foreground truncate">
							{session.user.email}
						</span>
						<Button
							variant="neutral"
							size="sm"
							onClick={() => void supabase.auth.signOut()}
						>
							Sign out
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-4 py-6">
				{isAdmin ? <Outlet /> : <NotAdmin />}
			</main>
		</>
	)
}

function NotAdmin() {
	return (
		<div className="mx-auto max-w-md space-y-2 pt-[10dvh] text-center">
			<h1 className="text-xl font-semibold">This account is not an admin</h1>
			<p className="text-muted-foreground">
				Sign out and sign in with an admin account, or ask an existing admin to
				add this account to the admin_user table.
			</p>
		</div>
	)
}
