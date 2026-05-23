import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { PasswordResetForm } from '@/components/password-reset-form'
import { useAuth } from '@/lib/use-auth'

export const Route = createFileRoute('/_auth/set-new-password')({
	component: SetNewPasswordPage,
})

// Supabase appends an error to the URL hash when a recovery link is bad —
// most often an expired or already-consumed one-time token. supabase-js
// strips the hash as soon as it processes the link, so capture it once at
// module load, before that happens.
const recoveryLinkError = readRecoveryLinkError()

function readRecoveryLinkError(): string | null {
	const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
	if (!hash.get('error') && !hash.get('error_code')) return null
	const description = hash.get('error_description')
	return description
		? description.replace(/\+/g, ' ')
		: 'This password reset link is invalid or has expired.'
}

const cardClass =
	'mx-auto mt-[10cqh] w-full max-w-md [padding:clamp(0.5rem,2cqw,2rem)]'

function SetNewPasswordPage() {
	const { isLoaded, isAuth } = useAuth()

	// A valid recovery link signs the user in (via the URL hash) before this
	// page settles. Once auth has resolved with no session, the link never
	// authenticated us — say why, instead of showing a form that can only
	// fail with a cryptic "Auth session missing" error.
	if (recoveryLinkError || (isLoaded && !isAuth)) {
		return (
			<Card className={cardClass} data-testid="reset-link-invalid">
				<CardHeader>
					<CardTitle>This reset link didn't work</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Callout variant="problem" alert>
						<p>
							{recoveryLinkError ??
								'This password reset link is invalid or has expired.'}
						</p>
						<p>Reset links can only be used once, and expire after an hour.</p>
					</Callout>
					<div className="flex flex-row justify-between">
						<Link
							to="/forgot-password"
							data-testid="request-new-link"
							className={buttonVariants({ variant: 'default' })}
						>
							Request a new link
						</Link>
						<Link
							to="/login"
							className={buttonVariants({ variant: 'neutral' })}
						>
							Back to login
						</Link>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (!isLoaded) {
		return (
			<Card className={cardClass}>
				<CardHeader>
					<CardTitle>Verifying your reset link…</CardTitle>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card className={cardClass}>
			<CardHeader>
				<CardTitle>Set your new password</CardTitle>
			</CardHeader>
			<PasswordResetForm />
		</Card>
	)
}
