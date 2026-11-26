import { Button } from '@/components/ui/button'
import { LoginSignupButtons } from '@/components/ui/authenticated-dialog'

export function GuestChoice({
	joining,
	onGuest,
}: {
	joining: boolean
	onGuest: () => void
}) {
	return (
		<div
			className="bg-card flex flex-col gap-3 rounded border p-4"
			data-testid="coach-guest-choice"
		>
			<p className="text-sm">
				With an account, your deck and this conversation are kept on every
				device. As a guest, they stay in this browser, and you can make an
				account later without losing them.
			</p>
			<Button
				data-testid="coach-continue-as-guest"
				disabled={joining}
				onClick={onGuest}
			>
				{joining ? 'Starting…' : 'Continue as guest'}
			</Button>
			<LoginSignupButtons />
		</div>
	)
}
