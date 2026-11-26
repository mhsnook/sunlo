import { type ErrorComponentProps, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ShowError } from '@/components/errors'
import { signOutHere } from '~/lib/session'

export function RouteError({ error, reset }: ErrorComponentProps) {
	const router = useRouter()
	return (
		<main className="mx-auto w-full max-w-md space-y-4 px-4 pt-[15dvh]">
			<ShowError show>
				<p>This page did not load: {error.message}</p>
			</ShowError>
			<div className="flex gap-2">
				<Button
					onClick={() => {
						reset()
						void router.invalidate()
					}}
				>
					Try again
				</Button>
				<Button
					variant="neutral"
					onClick={() =>
						void signOutHere().then(() => {
							reset()
							void router.invalidate()
						})
					}
				>
					Sign out
				</Button>
			</div>
		</main>
	)
}
