import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/friends/')({
	component: () => <Navigate to="/friends/chats" replace />,
})
