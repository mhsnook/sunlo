import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { ShowError } from '@/components/errors'
import { buttonVariants } from '@/components/ui/button'

export const Route = createLazyFileRoute('/_user/profile/change-email-confirm')(
	{
		component: ChangeEmailConfirmPage,
	}
)

function ChangeEmailConfirmPage() {
	const data = Route.useLoaderData()
	// console.log(`the loader data`, data)
	return (
		<>
			<CardHeader>
				<CardTitle>Change your registered email</CardTitle>
			</CardHeader>
			<CardContent>
				{data.error ? (
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
									className={buttonVariants({ variant: 'soft' })}
								>
									Try the change-email form again
								</Link>
							</p>
						</div>
					</ShowError>
				) : (
					<Callout Icon={SuccessCheckmarkTrans}>
						<p>Success!</p>
						<p>
							You've changed your email to <strong>{data.userEmail}</strong>.
						</p>
						<p>
							<Link to="/profile" className="s-link">
								Return to your profile page.
							</Link>
						</p>
					</Callout>
				)}
			</CardContent>
		</>
	)
}
