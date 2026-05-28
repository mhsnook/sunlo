import { CSSProperties } from 'react'
import { createLazyFileRoute, Outlet } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'

import Callout from '@/components/ui/callout'
import { useAuth } from '@/lib/use-auth'

export const Route = createLazyFileRoute('/_user/admin/messages')({
	component: AdminMessagesLayout,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function AdminMessagesLayout() {
	const { isAdmin, userEmail } = useAuth()

	return (
		<main style={style}>
			{!isAdmin && (
				<div data-testid="admin-not-authorized-warning" className="mb-6">
					<Callout variant="problem" Icon={ShieldAlert}>
						<p>
							You are logged in as <strong>{userEmail}</strong> who is not an
							admin user; mutations on this page will fail.
						</p>
					</Callout>
				</div>
			)}
			<Outlet />
		</main>
	)
}
