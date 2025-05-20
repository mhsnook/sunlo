import { Check, Send, ThumbsUp, UserCheck, X } from 'lucide-react'

import type { PublicProfile, PublicProfileFull } from '@/types/main'
import { Button } from '@/components/ui/button'
import { AvatarIconRow } from '@/components/ui/avatar-icon'
import { ConfirmDestructiveActionDialog } from '@/components/confirm-destructive-action-dialog'
import { useFriendRequestAction, useOneRelation } from '@/lib/friends'
import { Loader } from '@/components/ui/loader'

export function ProfileWithRelationship({
	profile,
}: {
	profile: PublicProfile | PublicProfileFull
}) {
	const { data: relationship } = useOneRelation(profile.uid)
	const inviteResponseMutation = useFriendRequestAction(profile.uid)

	return (
		<AvatarIconRow {...profile}>
			<div className="flex flex-row gap-2">
				{inviteResponseMutation.isPending ?
					<span className="size-8 rounded-full p-1">
						<Loader className="size-6" />
					</span>
				: inviteResponseMutation.isSuccess ?
					<span className="size-8 rounded-full bg-green-600 p-1">
						<Check className="size-6 text-white" />
					</span>
				: !relationship || relationship.status === 'unconnected' ?
					<Button
						variant="default"
						className="size-8"
						size="icon"
						title="Send friend request"
						onClick={() => inviteResponseMutation.mutate('invite')}
					>
						<Send className="mt-[0.1rem] mr-[0.1rem] size-6" />
					</Button>
				: relationship.status === 'pending' && !relationship.isMostRecentByMe ?
					<>
						<Button
							variant="default"
							className="size-8"
							size="icon"
							title="Accept pending invitation"
							onClick={() => inviteResponseMutation.mutate('accept')}
						>
							<ThumbsUp />
						</Button>
						<ConfirmDestructiveActionDialog
							title="Decline this invitation"
							description="Please confirm whether you'd like to decline this invitation"
						>
							<Button
								variant="secondary"
								className="size-8"
								size="icon"
								title="Decline pending invitation"
							>
								<X className="size-6 p-0" />
							</Button>
							<Button
								variant="destructive"
								title="Confirm: Decline friend request"
								onClick={() => inviteResponseMutation.mutate('decline')}
							>
								{inviteResponseMutation.isPending ?
									<Loader />
								: inviteResponseMutation.isSuccess ?
									<Check className="size-6 text-white" />
								:	<>Confirm</>}
							</Button>
						</ConfirmDestructiveActionDialog>
					</>
				: relationship?.status === 'pending' && relationship.isMostRecentByMe ?
					<ConfirmDestructiveActionDialog
						title={`Cancel this request`}
						description={`Please confirm whether you'd like to cancel this friend request`}
					>
						<Button
							variant="secondary"
							className="size-8"
							size="icon"
							title="Cancel friend request"
						>
							<X className="size-6 p-0" />
						</Button>
						<Button
							variant="destructive"
							title="Confirm: Cancel friend request"
							onClick={() => inviteResponseMutation.mutate('cancel')}
						>
							{inviteResponseMutation.isPending ?
								<Loader />
							: inviteResponseMutation.isSuccess ?
								<Check className="size-6 text-white" />
							:	<>Confirm</>}
						</Button>
					</ConfirmDestructiveActionDialog>
				: relationship.status === 'friends' ?
					<UserCheck className="size-6 p-0" />
				:	<> status is null for some reason</>}
			</div>
		</AvatarIconRow>
	)
}
