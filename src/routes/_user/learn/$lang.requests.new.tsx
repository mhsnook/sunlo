import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/requests/new')({
	beforeLoad: () => ({
		titleBar: { title: 'New Community Request' },
	}),
})
