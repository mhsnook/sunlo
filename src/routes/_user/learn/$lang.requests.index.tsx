import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/requests/')({
	beforeLoad: ({ params }) => {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw redirect({ to: '/learn/$lang/feed', params, replace: true })
	},
})
