import { useNavigate } from '@tanstack/react-router'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/use-auth'
import { GuestSignupForm } from './guest-signup-form'
import { signupLeads, type SignupReason } from './reasons'

/** The sign-up dialog that `?signup=<reason>` opens on any page, for a guest. */
export function GuestSignupDialog({ reason }: { reason: SignupReason }) {
	const { isAnonymous } = useAuth()
	const navigate = useNavigate()
	const close = () =>
		void navigate({
			to: '.',
			search: (prev) => ({ ...prev, signup: undefined }),
			replace: true,
		})

	return (
		<Dialog
			open={isAnonymous}
			onOpenChange={(open) => {
				if (!open) close()
			}}
		>
			<DialogContent className="sm:max-w-106" data-testid="guest-signup-dialog">
				<DialogHeader>
					<DialogTitle>Create your account</DialogTitle>
				</DialogHeader>
				<GuestSignupForm lead={signupLeads[reason]} onSkip={close} />
			</DialogContent>
		</Dialog>
	)
}
