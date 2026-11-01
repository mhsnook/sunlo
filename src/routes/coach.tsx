import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { preloadLibrary } from '@/features/coach'
import { languagesCollection } from '@/features/languages/collections'
import { authLifecycle } from '@/lib/auth-lifecycle'

export const Route = createFileRoute('/coach')({
	beforeLoad: ({ context, location }) => {
		if (!context.auth.isAuth)
			throw redirect({
				to: '/login',
				search: { redirectedFrom: location.href },
			})
	},
	loader: async ({ context: { auth } }) => {
		void preloadLibrary()
		await Promise.all([
			languagesCollection.preload(),
			authLifecycle.loadAllTheRequiredUserDataAfterNewLogin(auth.userId!),
		])
	},
	component: () => <Outlet />,
})
