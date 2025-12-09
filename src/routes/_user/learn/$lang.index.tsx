import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/')({
	beforeLoad: ({ params }) => {
		return redirect({ to: '/learn/$lang/feed', params })
	},
})
