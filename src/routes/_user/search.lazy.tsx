import { createLazyFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_user/search')({
	component: SearchLayout,
})

function SearchLayout() {
	return <Outlet />
}
