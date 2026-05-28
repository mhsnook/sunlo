import { createLazyFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_user/admin')({
	component: AdminLayout,
})

function AdminLayout() {
	return (
		<div className="bg-card/50 rounded border p-4 @md:p-6">
			<Outlet />
		</div>
	)
}
