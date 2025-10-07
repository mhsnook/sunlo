import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import * as z from 'zod'
import { ArrowRightLeft } from 'lucide-react'

import { ShowAndLogError } from '@/components/errors'
import { SuccessCheckmark } from '@/components/success-checkmark'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import Callout from '@/components/ui/callout'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/hooks'
import languages from '@/lib/languages'
import supabase from '@/lib/supabase-client'
import { useProfile, publicProfileQuery } from '@/hooks/use-profile'
import { Loader } from '@/components/ui/loader'
import type { PublicProfile } from './friends/-types'

const SearchSchema = z.object({
	uid_by: z.string().uuid(),
	uid_for: z.string().uuid(),
	lang: z.string().length(3),
})

export const Route = createFileRoute('/_user/accept-invite')({
	validateSearch: SearchSchema,
	component: AcceptInvitePage,
})

function AcceptInvitePage() {
	const search = Route.useSearch()
	const { data: friend, isPending } = useQuery(
		publicProfileQuery(search.uid_by)
	)
	if (!search?.uid_by)
		throw new Error('This URL is missing the uid_by parameter')
	const { userId } = useAuth()
	const { data: profile } = useProfile()
	if (!userId || userId !== search.uid_for)
		throw new Error(
			'Something went wrong; you are not logged in, or this invite link is for a different user'
		)

	const acceptOrDeclineMutation = useMutation({
		mutationKey: ['invite', 'accept-or-decline', search.uid_by],
		mutationFn: async ({ action }: { action: 'decline' | 'accept' }) => {
			const res = await supabase
				.from('friend_request_action')
				.insert({
					uid_by: search.uid_by,
					uid_for: userId,
					action_type: action,
				})
				.throwOnError()
				.select()
			return res
		},
		onSuccess: () => toast.success('Response successful'), // now redirect somewhere?,
		onError: (error) => {
			toast.error('An error has occurred')
			console.log(`The error accepting the friend invite:`, error)
		},
	})

	const AcceptInviteForm = () => {
		return (
			<>
				{profile ?
					<div className="relative mx-auto flex h-44 max-w-[400px] flex-row items-center justify-around gap-4">
						<img
							src={profile.avatarUrl}
							width=""
							className="mx-auto max-w-32 shrink rounded-xl"
							alt={`Your avatar`}
						/>
						{friend ?
							<>
								<ArrowRightLeft className="mx-auto opacity-70" />
								<img
									src={friend.avatarUrl}
									className="mx-auto max-w-32 shrink rounded-xl"
									alt={`${friend.username}'s avatar`}
								/>
							</>
						:	null}
					</div>
				:	null}
				<div className="flex flex-row justify-center gap-4">
					<Button
						size="lg"
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => acceptOrDeclineMutation.mutate({ action: 'accept' })}
						disabled={acceptOrDeclineMutation.isPending}
					>
						Accept invitation
					</Button>
					<Button
						size="lg"
						variant="secondary"
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() =>
							acceptOrDeclineMutation.mutate({ action: 'decline' })
						}
						disabled={acceptOrDeclineMutation.isPending}
					>
						Ignore
					</Button>
				</div>
			</>
		)
	}

	return (
		<main className="w-app flex h-screen flex-col justify-center p-2 pb-20">
			{isPending ?
				<Loader />
			:	<Card>
					<CardHeader>
						<CardTitle>
							Accept invite from <strong>{friend?.username}</strong>?
						</CardTitle>
						<CardDescription>
							You'll be able to see some details about their journey learning{' '}
							{languages[search.lang]}; they won't have any access to your
							private data (unless you invite them to a deck you're working on).
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{acceptOrDeclineMutation.error ?
							<ShowAndLogError
								error={acceptOrDeclineMutation.error}
								text="Something went wrong"
							/>
						: !acceptOrDeclineMutation.isSuccess ?
							<AcceptInviteForm />
						: acceptOrDeclineMutation.variables.action === 'accept' ?
							<ShowAccepted friend={friend} />
						:	<ShowDeclined />}
					</CardContent>
				</Card>
			}
		</main>
	)
}

const ShowAccepted = ({ friend }: { friend?: PublicProfile | null }) => {
	if (!friend)
		throw new Error(
			`Attempted to render the "success" message` +
				` but the app isn't aware that the friend request has been accepted,` +
				` or that the friend's public profile has even been loaded`
		)
	return (
		<Callout Icon={SuccessCheckmark}>
			<div>
				<h2 className="h3">
					Okay! You're now connected with {friend.username}.
				</h2>
				<p>
					<Link
						to="/friends/$uid"
						from={Route.fullPath}
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ uid: friend.uid }}
						className={buttonVariants({ variant: 'default' })}
					>
						Check out their profile
					</Link>
				</p>
			</div>
		</Callout>
	)
}
const ShowDeclined = () => (
	<Callout variant="ghost">
		<div>
			<h2 className="h4">Invitation ignored</h2>
			<p>We won't show you this invitation again.</p>
		</div>
	</Callout>
)
