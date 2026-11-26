import { useNavigate } from '@tanstack/react-router'
import * as z from 'zod'

// Why the guest sign-up dialog is open. It travels in the root route's
// `?signup=` search param, so a coach `navigate` can open it on arrival.
export const SignupReasonSchema = z.enum(['learn', 'public', 'coach'])

export type SignupReason = z.infer<typeof SignupReasonSchema>

export const signupLeads: Record<SignupReason, string> = {
	learn: 'Learning with Sunlo needs an account.',
	public: 'Adding to the public library needs an account.',
	coach: 'An account keeps your deck and your coach conversation.',
}

export function useOpenGuestSignup() {
	const navigate = useNavigate()
	return (reason: SignupReason) =>
		void navigate({
			to: '.',
			search: (prev) => ({ ...prev, signup: reason }),
			replace: true,
		})
}
