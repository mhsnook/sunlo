import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/profile')({
	staticData: {
		titleBar: { title: 'Manage your Profile' },
	},
})
