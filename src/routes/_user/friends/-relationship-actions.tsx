import { ThumbsUp, UserCheck, UserMinus, X } from 'lucide-react'

import { uuid } from './-types'
import { ConfirmDestructiveActionDialog } from '@/components/confirm-destructive-action-dialog'
import { Button } from '@/components/ui/button'
import { useFriendRequestAction, useOneRelation } from '@/hooks/use-friends'
import { useAuth } from '@/lib/hooks'
import { Loader } from '@/components/ui/loader'

export function RelationshipActions({ uid_for }: { uid_for: uuid }) {
	const { userId } = useAuth()
	const action = useFriendRequestAction(uid_for)
	const { data: relationship } = useOneRelation(uid_for)
	return (
		!userId ? null
		: !relationship?.status || relationship.status === 'unconnected' ?
			<Button
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={() => action.mutate('invite')}
			>
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
				<Button
					variant="destructive"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => action.mutate('remove')}
				>
					<UserMinus />
					Unfriend
				</Button>
			</ConfirmDestructiveActionDialog>
		: relationship.status === 'pending' && !relationship.isMostRecentByMe ?
			<div className="flex flex-row items-center justify-center gap-2">
				<Button
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => action.mutate('accept')}
				>
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
						// oxlint-disable-next-line jsx-no-new-function-as-prop
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
				<Button
					variant="destructive"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => action.mutate('cancel')}
				>
					Cancel request
				</Button>
			</ConfirmDestructiveActionDialog>
		:	null
	)
}
