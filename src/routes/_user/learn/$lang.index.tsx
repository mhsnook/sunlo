import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/')({
	beforeLoad: ({ params }) => {
		throw redirect({ to: '/learn/$lang/feed', params })
	},
})
