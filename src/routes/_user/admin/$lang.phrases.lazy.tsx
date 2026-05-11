import { CSSProperties } from 'react'
import { createLazyFileRoute, Outlet } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import Callout from '@/components/ui/callout'
import { ShieldAlert } from 'lucide-react'

export const Route = createLazyFileRoute('/_user/admin/$lang/phrases')({
	component: AdminPhrasesLayout,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function AdminPhrasesLayout() {
	const { isAdmin, userEmail } = useAuth()

	return (
		<main style={style} data-testid="admin-phrases-page">
			{!isAdmin && (
				<div data-testid="admin-not-authorized-warning">
					<Callout variant="problem" Icon={ShieldAlert}>
						<p>
							You are logged in as <strong>{userEmail}</strong> who is not an
							admin user; the forms on this page will not work.
						</p>
					</Callout>
				</div>
			)}
			<Outlet />
		</main>
	)
}
