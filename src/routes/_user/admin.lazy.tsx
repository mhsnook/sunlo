import { createLazyFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_user/admin')({
	component: () => <Outlet />,
})
