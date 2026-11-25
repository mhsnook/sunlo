import { Button } from '@/components/ui/button'
import { LoginSignupButtons } from '@/components/ui/authenticated-dialog'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

export function GuestChoiceDialog({
	open,
	onGuest,
	onClose,
}: {
	open: boolean
	onGuest: () => void
	onClose: () => void
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-106" data-testid="coach-guest-choice">
				<DialogHeader>
					<DialogTitle>Save your deck to an account?</DialogTitle>
					<DialogDescription>
						With an account, your deck and this conversation are kept on every
						device. As a guest, they stay in this browser, and you can make an
						account later without losing them.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<Button data-testid="coach-continue-as-guest" onClick={onGuest}>
						Continue as guest
					</Button>
					<LoginSignupButtons />
				</div>
			</DialogContent>
		</Dialog>
	)
}
