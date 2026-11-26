import { useNavigate } from '@tanstack/react-router'
import { toastError } from '@/components/ui/sonner'

import { useAuth } from '@/lib/use-auth'
import {
	useSetGuestSignup,
	type SignupReason,
} from '@/components/guest-signup/reasons'

/**
 * Hook to require authentication for an action.
 * If not authenticated, shows a toast and redirects to login; a guest gets the
 * sign-up dialog instead.
 * @returns A function that wraps an action and checks for auth first.
 */
export function useRequireAuth({
	guestReason = 'public',
}: { guestReason?: SignupReason } = {}) {
	const { hasAccount, isAnonymous } = useAuth()
	const navigate = useNavigate()
	const setGuestSignup = useSetGuestSignup()

	return (action: () => void, message = 'Please log in to continue') => {
		if (hasAccount) action()
		else if (isAnonymous) setGuestSignup(guestReason)
		else {
			toastError(message)
			void navigate({
				to: '/login',
				search: { redirectedFrom: window.location.href },
			})
		}
	}
}

/**
 * Hook to check if the user is authenticated.
 * Useful for conditionally rendering auth-gated UI.
 */
export function useIsAuthenticated(): boolean {
	return useAuth().hasAccount
}
