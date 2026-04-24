import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/admin/$lang/')({
	beforeLoad: ({ params }) => {
		return redirect({ to: '/admin/$lang/phrases', params })
	},
})
