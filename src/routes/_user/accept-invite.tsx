import { ShowError } from '@/components/errors'
import SuccessCheckmark from '@/components/SuccessCheckmark'
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
import { useProfile, publicProfileQuery } from '@/lib/use-profile'
import { useMutation, useQuery } from '@tanstack/react-query'

import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRightLeft } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import toast from 'react-hot-toast'
import { z } from 'zod'

const SearchSchema = z.object({
	uid_by: z.string().uuid(),
	uid_for: z.string().uuid(),
	user_deck_id: z.string().uuid(),
	lang: z.string().length(3),
})

type SearchType = z.infer<typeof SearchSchema>

export const Route = createFileRoute('/_user/accept-invite')({
	validateSearch: (search: Record<string, unknown>): SearchType => ({
		uid_by: search.uid_by as string,
		uid_for: search.uid_for as string,
		user_deck_id: search.user_deck_id as string,
		lang: search.lang as string,
	}),
	component: AcceptInvitePage,
})

function AcceptInvitePage() {
	const search = Route.useSearch()
	const { data: learner, isPending } = useQuery(
		publicProfileQuery(search.uid_by)
	)
	const { data: friend } = useProfile()
	const { userId } = useAuth()
	if (userId !== search.uid_for) console.log(`mismatched logins`)

	const acceptOrDeclineMutation = useMutation({
		mutationKey: ['invite', 'accept-or-decline', search.uid_by],
		mutationFn: async ({ action }: { action: 'decline' | 'accept' }) => {
			const res = await supabase
				.from('friend_request_action')
				.insert({
					uid_by: search.uid_by,
					uid_for: userId,
					user_deck_id: search.user_deck_id,
					action_type: action,
				})
				.select()
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
				{learner.avatar_url ?
					<div className="relative mx-auto flex h-44 max-w-[400px] flex-row items-center justify-around gap-4">
						<img
							src={learner.avatar_url}
							width=""
							className="mx-auto max-w-32 shrink rounded-xl"
							alt={`${learner.username}'s profile picture`}
						/>
						{friend.avatar_url ?
							<>
								<ArrowRightLeft className="mx-auto opacity-70" />
								<img
									src={learner.avatar_url}
									className="mx-auto max-w-32 shrink rounded-xl"
									alt={`${learner.username}'s profile picture`}
								/>
							</>
						:	null}
					</div>
				:	null}
				<div className="flex flex-row justify-center gap-4">
					<Button
						size="lg"
						onClick={() => acceptOrDeclineMutation.mutate({ action: 'accept' })}
						disabled={acceptOrDeclineMutation.isPending}
					>
						Accept invitation
					</Button>
					<Button
						size="lg"
						variant="secondary"
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
						<CardTitle>Accept invite from {learner.username}?</CardTitle>
						<CardDescription>
							You'll be able to see some details about their journey learning{' '}
							{languages[search.lang]}; they won't have any access to your
							private data (unless you invite them to a deck you're working on).
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{acceptOrDeclineMutation.error ?
							<ShowError show={!!acceptOrDeclineMutation.error}>
								<p className="text-destructive-foreground h5 font-bold">
									Something went wrong...
								</p>
								<p>{acceptOrDeclineMutation.error?.message}</p>
							</ShowError>
						: !acceptOrDeclineMutation.isSuccess ?
							<AcceptInviteForm />
						: acceptOrDeclineMutation.variables.action === 'accept' ?
							<ShowAccepted />
						:	<ShowDeclined />}
					</CardContent>
				</Card>
			}
		</main>
	)
}

const ShowAccepted = () => (
	<Callout>
		<SuccessCheckmark />
		<div>
			<h2 className="h3">Okay! You're connected.</h2>
			<p>
				<Link className={buttonVariants({ variant: 'default' })}>
					Maybe go look at their deck?
				</Link>
			</p>
		</div>
	</Callout>
)

const ShowDeclined = () => (
	<Callout variant="ghost">
		<div>
			<h2 className="h4">Invitation ignored</h2>
			<p>We won't show you this invitation again.</p>
		</div>
	</Callout>
)
