import { useNavigate } from '@tanstack/react-router'
import { toastError } from '@/components/ui/sonner'

import { useAuth } from '@/lib/use-auth'

type AuthGateOptions = {
	/** Let an anonymous user through: only for their own data, never public content */
	allowAnonymous?: boolean
}

/**
 * Hook to require authentication for an action.
 * If not authenticated, shows a toast and redirects to login.
 * @returns A function that wraps an action and checks for auth first.
 */
export function useRequireAuth({
	allowAnonymous = false,
}: AuthGateOptions = {}) {
	const { isAuth, hasAccount } = useAuth()
	const navigate = useNavigate()

	return (action: () => void, message = 'Please log in to continue') => {
		if (!(allowAnonymous ? isAuth : hasAccount)) {
			toastError(message)
			void navigate({
				to: '/login',
				search: { redirectedFrom: window.location.href },
			})
		} else {
			action()
		}
	}
}

/**
 * Hook to check if the user is authenticated.
 * Useful for conditionally rendering auth-gated UI.
 */
export function useIsAuthenticated({
	allowAnonymous = false,
}: AuthGateOptions = {}): boolean {
	const { isAuth, hasAccount } = useAuth()
	return allowAnonymous ? isAuth : hasAccount
}
