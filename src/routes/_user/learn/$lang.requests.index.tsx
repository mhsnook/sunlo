import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/requests/')({
	beforeLoad: ({ params }) => {
		throw redirect({ to: '/learn/$lang/feed', params, replace: true })
	},
})
