import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/admin/$lang/phrases')({
	staticData: {
		appnav: [
			'/admin/$lang/phrases',
			'/admin/$lang/requests',
			'/admin/messages',
		],
		titleBar: { title: 'Admin', subtitle: 'Phrase Management' },
	},
})
