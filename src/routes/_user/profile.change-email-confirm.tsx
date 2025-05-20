import { createFileRoute, Link } from '@tanstack/react-router'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import SuccessCheckmark from '@/components/success-checkmark'
import supabase from '@/lib/supabase-client'
import { ShowError } from '@/components/errors'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createFileRoute('/_user/profile/change-email-confirm')({
	component: ChangeEmailConfirmPage,
	loader: async ({ location }) => {
		const hashParams = new URLSearchParams(location.hash)
		// console.log(`inside the loader`, location, hashParams)
		const {
			data: { user },
		} = await supabase.auth.getUser()
		return {
			userEmail: user?.email ?? '',
			error: hashParams.get('error'),
			errorDescription: hashParams.get('error_description'),
		}
	},
})

function ChangeEmailConfirmPage() {
	const data = Route.useLoaderData()
	// console.log(`the loader data`, data)
	return (
		<>
			<CardHeader>
				<CardTitle>Change your registered email</CardTitle>
			</CardHeader>
			<CardContent>
				{data.error ?
					<ShowError>
						<div className="flex flex-col gap-2">
							<p className="font-bold">Error: {data.error}</p>
							<p>
								<blockquote className="border-s-4 ps-4">
									{data.errorDescription}
								</blockquote>
							</p>
							<p>
								Your email is currently set to <strong>{data.userEmail}</strong>
								, if you still want to change it:
							</p>
							<p>
								<Link
									to="/profile/change-email"
									from={Route.fullPath}
									className={buttonVariants({ variant: 'outline' })}
								>
									Try the change-email form again
								</Link>
							</p>
						</div>
					</ShowError>
				:	<Callout Icon={() => <SuccessCheckmark className="bg-transparent" />}>
						<p>Success!</p>
						<p>
							You've changed your email to <strong>{data.userEmail}</strong>.
						</p>
						<p>
							<Link to="/profile" from={Route.fullPath} className="s-link">
								Return to your profile page.
							</Link>
						</p>
					</Callout>
				}
			</CardContent>
		</>
	)
}
