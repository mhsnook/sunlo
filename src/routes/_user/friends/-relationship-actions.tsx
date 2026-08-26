import { ThumbsUp, UserCheck, UserMinus, X } from 'lucide-react'

import type { uuid } from '@/types/main'
import { ConfirmDestructiveActionDialog } from '@/components/confirm-destructive-action-dialog'
import { Button } from '@/components/ui/button'
import { useFriendRequestAction, useOneRelation } from '@/features/social/hooks'
import { useUserId } from '@/lib/use-auth'
import { IconSizedLoader } from '@/components/ui/loader'

export function RelationshipActions({ uid_for }: { uid_for: uuid }) {
	const userId = useUserId()
	const action = useFriendRequestAction(uid_for)
	const { data: relationship } = useOneRelation(uid_for)
	return !userId ? null : !relationship?.status ||
	  relationship.status === 'unconnected' ? (
		<Button
			data-testid="add-friend-button"
			onClick={() => action.act('invite')}
		>
			Add friend {action.isPending ? <IconSizedLoader /> : <ThumbsUp />}
		</Button>
	) : relationship.status === 'friends' ? (
		<ConfirmDestructiveActionDialog
			title="Would you like to remove this friendship?"
			description="You won't be able to see each other's decks or progress any more."
		>
			<Button
				data-testid="friends-status-button"
				variant="soft"
				className="hover:bg-destructive/30"
			>
				<UserCheck />
				Friends
			</Button>
			<Button
				data-testid="unfriend-button"
				variant="red"
				onClick={() => action.act('remove')}
			>
				<UserMinus />
				Unfriend
			</Button>
		</ConfirmDestructiveActionDialog>
	) : relationship.status === 'pending' && !relationship.isMostRecentByMe ? (
		<div className="flex flex-row items-center justify-center gap-2">
			<Button
				data-testid="accept-friend-request-button"
				onClick={() => action.act('accept')}
			>
				Confirm friends {action.isPending ? <IconSizedLoader /> : <ThumbsUp />}
			</Button>
			<ConfirmDestructiveActionDialog
				title="Decline this friend request?"
				description="You can still invite them to be friends later."
			>
				<Button data-testid="decline-friend-request-button" variant="neutral">
					<X />
				</Button>
				<Button
					data-testid="confirm-decline-friend-request-button"
					variant="red"
					onClick={() => action.act('decline')}
				>
					Confirm
				</Button>
			</ConfirmDestructiveActionDialog>
		</div>
	) : relationship.status === 'pending' && relationship.isMostRecentByMe ? (
		<ConfirmDestructiveActionDialog
			title="Cancel your friend request?"
			description=""
		>
			<Button
				data-testid="requested-status-button"
				variant="soft"
				className="hover:bg-destructive/30"
			>
				<UserCheck /> Requested
			</Button>
			<Button
				data-testid="cancel-friend-request-button"
				variant="red"
				onClick={() => action.act('cancel')}
			>
				Cancel request
			</Button>
		</ConfirmDestructiveActionDialog>
	) : null
}
