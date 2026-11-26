import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/use-auth'
import { GuestSignupForm } from './guest-signup-form'
import { signupLeads, useSetGuestSignup, type SignupReason } from './reasons'

export function GuestSignupDialogContent({
	lead,
	onSkip,
}: {
	lead: string
	onSkip?: () => void
}) {
	return (
		<DialogContent className="sm:max-w-106" data-testid="guest-signup-dialog">
			<DialogHeader>
				<DialogTitle>Create your account</DialogTitle>
			</DialogHeader>
			<GuestSignupForm lead={lead} onSkip={onSkip} />
		</DialogContent>
	)
}

/** The sign-up dialog that `?signup=<reason>` opens on any page, for a guest. */
export function GuestSignupDialog({ reason }: { reason: SignupReason }) {
	const { isAnonymous } = useAuth()
	const setGuestSignup = useSetGuestSignup()
	const close = () => setGuestSignup(undefined)

	return (
		<Dialog
			open={isAnonymous}
			onOpenChange={(open) => {
				if (!open) close()
			}}
		>
			<GuestSignupDialogContent lead={signupLeads[reason]} onSkip={close} />
		</Dialog>
	)
}
