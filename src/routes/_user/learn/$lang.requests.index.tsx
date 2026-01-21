import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/requests/')({
	beforeLoad: ({ params }) => {
		console.log(
			'Issuing redirect to /learn/$lang/feed from /$lang.requests.index page'
		)
		throw redirect({ to: '/learn/$lang/feed', params, replace: true })
	},
})
