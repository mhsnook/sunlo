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
import { createFileRoute } from '@tanstack/react-router'
import { ThumbsUp, User, UserCheck, UserMinus, X } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useQuery } from '@tanstack/react-query'

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
	return (
		<main className="px-2 py-6 max-w-sm mx-auto">
			{isMine ?
				<p className="text-muted-foreground text-center italic mb-1">
					This is how your profile appears to others
				</p>
			:	null}
			<Card>
				<CardHeader>
					<CardTitle className="mx-auto">
						{profile?.username}
						<span className="opacity-70">'s profile</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-center">
					<div className="w-32 h-32 rounded-full bg-muted-foreground/40 mx-auto flex items-center justify-center text-4xl relative">
						{profile?.avatar_url ?
							<img
								src={profile.avatar_url}
								className="rounded-full w-32 h-32 object-cover"
							/>
						:	<>
								<User className="rounded-full w-32 h-32 p-1 text-muted-foreground/20 blur-xs" />
								<span className="capitalize font-bold absolute top-0 bottom-0 left-0 right-0 h-32 w-32 flex items-center justify-center">
									{profile.username.slice(0, 2)}
								</span>
							</>
						}
					</div>
					<h2 className="text-xl font-semibold">{profile.username}</h2>
					<div>
						<p className="capitalize text-muted-foreground text-sm mb-2">
							{relationship?.status ?? 'unconnected'}
						</p>
						<RelationshipActions uid_for={uid} />
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
			<div className="flex flex-row gap-2 items-center justify-center">
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
