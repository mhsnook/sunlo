import { ConfirmDestructiveActionDialog } from '@/components/confirm-destructive-action-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import {
	useFriendRequestAction,
	useOneRelation,
	useRelations,
} from '@/lib/friends'
import { useAuth } from '@/lib/hooks'
import { publicProfileQuery } from '@/lib/use-profile'
import { uuid } from '@/types/main'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
	MessagesSquare,
	ThumbsUp,
	User,
	UserCheck,
	UserMinus,
	X,
} from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useQuery } from '@tanstack/react-query'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createFileRoute('/_user/friends/$uid')({
	component: ProfilePage,
	loader: async ({ context, params }) => {
		const { uid } = params
		const isMine = uid === context.auth.userId
		await context.queryClient.ensureQueryData(publicProfileQuery(uid))
		return { uid, isMine }
	},
})

function ProfilePage() {
	const { uid, isMine } = Route.useLoaderData()
	const { data: profile } = useQuery(publicProfileQuery(uid))
	const { data: relations } = useRelations()
	const relationship = !relations || !uid ? null : relations.relationsMap[uid]

	if (!profile)
		throw new Error(
			'Something went wrong loading this profile... please contact administrator'
		)
	return (
		<main className="mx-auto max-w-sm px-2 py-6">
			{isMine ?
				<p className="text-muted-foreground mb-1 text-center italic">
					This is how your profile appears to others
				</p>
			:	null}
			<Card>
				<CardHeader>
					<CardTitle className="mx-auto">
						{profile.username}
						<span className="opacity-70">'s profile</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-center">
					<div className="bg-muted-foreground/40 relative mx-auto flex size-32 items-center justify-center rounded-full text-4xl">
						{profile.avatarUrl ?
							<img
								src={profile.avatarUrl}
								alt={`${profile.username ? `${profile.username}'s` : 'Your'} avatar`}
								className="size-32 rounded-full object-cover"
							/>
						:	<>
								<User className="text-muted-foreground/20 size-32 rounded-full p-1 blur-xs" />
								<span className="absolute top-0 right-0 bottom-0 left-0 flex size-32 items-center justify-center font-bold capitalize">
									{(profile.username ?? '').slice(0, 2)}
								</span>
							</>
						}
					</div>
					<h2 className="text-xl font-semibold">{profile.username}</h2>
					<div>
						<p className="text-muted-foreground mb-2 text-sm capitalize">
							{relationship?.status ?? 'unconnected'}
						</p>
						<div className="flex flex-row items-center justify-center gap-2">
							<RelationshipActions uid_for={uid} />
							{relationship?.status === 'friends' && (
								<Link
									className={buttonVariants({ variant: 'outline' })}
									to="/friends/chats/$friendId"
									params={{ friendId: profile.uid }}
								>
									<MessagesSquare /> Message
								</Link>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</main>
	)
}

function RelationshipActions({ uid_for }: { uid_for: uuid }) {
	const { userId } = useAuth()
	const action = useFriendRequestAction(uid_for)
	const { data: relationship } = useOneRelation(uid_for)
	return (
		!userId ? null
		: !relationship?.status || relationship.status === 'unconnected' ?
			<Button onClick={() => action.mutate('invite')}>
				Add friend{' '}
				{action.isPending ?
					<Loader />
				:	<ThumbsUp />}
			</Button>
		: relationship.status === 'friends' ?
			<ConfirmDestructiveActionDialog
				title="Would you like to remove this friendship?"
				description="You won't be able to see each other's decks or progress any more."
			>
				<Button variant="outline" className="hover:bg-destructive/30">
					<UserCheck />
					Friends
				</Button>
				<Button variant="destructive" onClick={() => action.mutate('remove')}>
					<UserMinus />
					Unfriend
				</Button>
			</ConfirmDestructiveActionDialog>
		: relationship.status === 'pending' && !relationship.isMostRecentByMe ?
			<div className="flex flex-row items-center justify-center gap-2">
				<Button onClick={() => action.mutate('accept')}>
					Confirm friends{' '}
					{action.isPending ?
						<Loader />
					:	<ThumbsUp />}
				</Button>
				<ConfirmDestructiveActionDialog
					title="Decline this friend request?"
					description="You can still invite them to be friends later."
				>
					<Button variant="secondary">
						<X />
					</Button>
					<Button
						variant="destructive"
						onClick={() => action.mutate('decline')}
					>
						Confirm
					</Button>
				</ConfirmDestructiveActionDialog>
			</div>
		: relationship.status === 'pending' && relationship.isMostRecentByMe ?
			<ConfirmDestructiveActionDialog
				title="Cancel your friend request?"
				description=""
			>
				<Button variant="outline" className="hover:bg-destructive/30">
					<UserCheck /> Requested
				</Button>
				<Button variant="destructive" onClick={() => action.mutate('cancel')}>
					Cancel request
				</Button>
			</ConfirmDestructiveActionDialog>
		:	null
	)
}
