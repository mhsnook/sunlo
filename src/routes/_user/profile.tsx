import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/profile')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Manage your Profile',
		},
	}),
})
