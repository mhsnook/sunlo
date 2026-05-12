import { createLazyFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_user/admin/$lang')({
	component: AdminLangLayout,
})

function AdminLangLayout() {
	return <Outlet />
}
