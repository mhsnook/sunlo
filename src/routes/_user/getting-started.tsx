import { createFileRoute, redirect } from '@tanstack/react-router'
import type { uuid } from '@/types/main'

type GettingStartedProps = {
	referrer?: uuid
}

export const Route = createFileRoute('/_user/getting-started')({
	validateSearch: (search?: Record<string, unknown>): GettingStartedProps => {
		return search
			? {
					referrer: (search.referrer as string) || undefined,
				}
			: {}
	},
	beforeLoad: ({ context }) => {
		if (!context.auth.isAuth) {
			console.log(
				'Issuing redirect to /login from /getting-started page bc not logged in'
			)
			throw redirect({ to: '/login' })
		}
		return {
			titleBar: {
				title: 'Getting Started',
				subtitle: 'Set your username and dive in!',
			},
		}
	},
})
