import type { ReactNode } from 'react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/use-auth'
import { LoginCardBody } from '@/components/login-card-body'
import { LazyGuestSignupForm } from '@/components/guest-signup/lazy-guest-signup-form'
import { signupLeads } from '@/components/guest-signup/reasons'

interface RequireAuthProps {
	children: ReactNode
	/** Message to show explaining why login is needed */
	message?: string
	/** Let an anonymous user through: only for their own data, never public content */
	allowAnonymous?: boolean
	/** What a guest is trying to do, as one sentence, e.g. "Adding a friend needs an account." */
	guestLead?: string
}

/**
 * Wrapper component for routes that require authentication.
 * Shows an inline login form with back button instead of redirecting.
 */
export function RequireAuth({
	children,
	message = 'You need to be logged in to access this page.',
	allowAnonymous = false,
	guestLead = signupLeads.public,
}: RequireAuthProps) {
	const { isAuth, hasAccount } = useAuth()

	if (allowAnonymous ? isAuth : hasAccount) {
		return <>{children}</>
	}

	return <AuthGate message={message} guestLead={guestLead} />
}

function AuthGate({
	message,
	guestLead,
}: {
	message: string
	guestLead: string
}) {
	const { isAnonymous } = useAuth()
	const navigate = useNavigate()
	const router = useRouter()
	const canGoBack = useCanGoBack()

	const handleGoBack = () => {
		if (canGoBack) {
			router.history.back()
		} else {
			void navigate({ to: '/learn' })
		}
	}

	return (
		<div className="flex flex-col items-center gap-6 py-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleGoBack}
							className="shrink-0"
						>
							<ChevronLeft />
							<span className="sr-only">Go back</span>
						</Button>
						<span>
							{isAnonymous ? 'Create your account' : 'Login Required'}
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{isAnonymous ? (
						<LazyGuestSignupForm lead={guestLead} />
					) : (
						<>
							<p className="text-muted-foreground">{message}</p>
							<LoginCardBody />
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

// Re-export hooks from the hooks file for convenience
export { useIsAuthenticated, useRequireAuth } from '@/hooks/use-require-auth'
