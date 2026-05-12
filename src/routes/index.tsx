import { createFileRoute, redirect } from '@tanstack/react-router'
import { isNativeAppUserAgent } from '@/lib/utils'

export const Route = createFileRoute('/')({
	beforeLoad: ({ context }) => {
		// If the app was launched from the user's homescreen shortcut
		// we should skip the homepage and go straight to learning or login
		if (isNativeAppUserAgent()) {
			if (context.auth?.isAuth) {
				console.log(
					'Issuing redirect to /learn from /index.tsx bc we detected native app user agent'
				)
				throw redirect({
					to: '/learn',
				})
			} else {
				console.log(
					'Issuing redirect to /login from /index.tsx bc we detected native app user agent'
				)
				throw redirect({ to: '/login' })
			}
		}
		return context.auth
	},
})
