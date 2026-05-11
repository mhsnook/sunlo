import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/admin/routes')({
	staticData: {
		titleBar: {
			title: 'Routes',
			subtitle: 'Static introspection of the route tree',
		},
		fullWidth: true,
	},
})
