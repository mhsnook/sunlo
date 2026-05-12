import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/friends/chats/$friendUid')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Chat',
		},
		appnav: [],
	}),
})
