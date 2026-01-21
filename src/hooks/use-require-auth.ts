import { useNavigate } from '@tanstack/react-router'
import { toastError } from '@/components/ui/error-toast'

import { useAuth } from '@/lib/use-auth'

/**
 * Hook to require authentication for an action.
 * If not authenticated, shows a toast and redirects to login.
 * @returns A function that wraps an action and checks for auth first.
 */
export function useRequireAuth() {
	const { isAuth } = useAuth()
	const navigate = useNavigate()

	return (action: () => void, message = 'Please log in to continue') => {
		if (!isAuth) {
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
export function useIsAuthenticated(): boolean {
	const { isAuth } = useAuth()
	return isAuth
}
