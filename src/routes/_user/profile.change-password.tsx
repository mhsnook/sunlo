import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/profile/change-password')({
	component: () => <div>Hello /_user/profile/change-password!</div>,
})
