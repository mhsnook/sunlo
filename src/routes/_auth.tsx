import { createFileRoute, Outlet } from '@tanstack/react-router'

// these pages relate to the auth flow, such as sign in, sign up, etc
// they do not require the user to be logged in
export const Route = createFileRoute('/_auth')({
	component: () => (
		<div className="px-4">
			<Outlet />
		</div>
	),
})
