import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/admin/$lang/requests')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Admin',
			subtitle: 'Request Management',
		},
		appnav: ['/admin/$lang/phrases', '/admin/$lang/requests'],
	}),
})
