import { createFileRoute, Outlet } from '@tanstack/react-router'
import { languagesCollection } from '@/features/languages/collections'
import { authLifecycle } from '@/lib/auth-lifecycle'

// Open to visitors: the coach page signs one in anonymously when they send
// their first message (useCoach).
export const Route = createFileRoute('/coach')({
	loader: async ({ context: { auth } }) => {
		await Promise.all([
			languagesCollection.preload(),
			auth.userId
				? authLifecycle.loadAllTheRequiredUserDataAfterNewLogin(auth.userId)
				: null,
		])
	},
	component: () => <Outlet />,
})
