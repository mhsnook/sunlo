import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/')({
	loader: ({ params }) => {
		void redirect({ to: '/learn/$lang/feed', params, replace: true })
	},
})
