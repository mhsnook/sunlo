import { TitleBar } from '@/types/main'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/profile')({
	component: ProfilePage,
	loader: () => ({
		titleBar: {
			title: `Manage your Profile`,
		} as TitleBar,
	}),
})

function ProfilePage() {
	return <Outlet />
}
