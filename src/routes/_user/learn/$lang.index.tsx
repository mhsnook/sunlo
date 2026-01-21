import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/')({
	beforeLoad: ({ params }) => {
		console.log('Issuing redirect to /learn/$lang/feed from /learn/$lang.index')
		return redirect({ to: '/learn/$lang/feed', params })
	},
})
