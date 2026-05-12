import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/admin/$lang/phrases')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Admin',
			subtitle: 'Phrase Management',
		},
		appnav: ['/admin/$lang/phrases', '/admin/$lang/requests'],
	}),
})
