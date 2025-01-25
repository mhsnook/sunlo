import { Check, Send, ThumbsUp, UserCheck, X } from 'lucide-react'

import type { PublicProfile, PublicProfileFull } from '@/types/main'
import { Button } from '@/components/ui/button'
import { AvatarIconRow } from '@/components/ui/avatar-icon'
import { ConfirmDestructiveActionDialog } from './confirm-destructive-action-dialog'
import { useFriendRequestAction, useOneRelation } from '@/lib/friends'
import { Loader } from './ui/loader'

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
					<span className="h-8 w-8 rounded-full p-1">
						<Loader className="size-6" />
					</span>
				: inviteResponseMutation.isSuccess ?
					<span className="bg-green-600 h-8 w-8 rounded-full p-1">
						<Check className="text-white w-6 h-6" />
					</span>
				: !relationship || relationship.status === 'unconnected' ?
					<Button
						variant="default"
						className="w-8 h-8"
						size="icon"
						title="Send friend request"
						onClick={() => inviteResponseMutation.mutate('invite')}
					>
						<Send className="w-6 h-6 mr-[0.1rem] mt-[0.1rem]" />
					</Button>
				: relationship.status === 'pending' && !relationship.isMostRecentByMe ?
					<>
						<Button
							variant="default"
							className="w-8 h-8"
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
								className="w-8 h-8"
								size="icon"
								title="Decline pending invitation"
							>
								<X className="w-6 h-6 p-0" />
							</Button>
							<Button
								variant="destructive"
								title="Confirm: Decline friend request"
								onClick={() => inviteResponseMutation.mutate('decline')}
							>
								{inviteResponseMutation.isPending ?
									<Loader />
								: inviteResponseMutation.isSuccess ?
									<Check className="text-white w-6 h-6" />
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
							className="w-8 h-8"
							size="icon"
							title="Cancel friend request"
						>
							<X className="w-6 h-6 p-0" />
						</Button>
						<Button
							variant="destructive"
							title="Confirm: Cancel friend request"
							onClick={() => inviteResponseMutation.mutate('cancel')}
						>
							{inviteResponseMutation.isPending ?
								<Loader />
							: inviteResponseMutation.isSuccess ?
								<Check className="text-white w-6 h-6" />
							:	<>Confirm</>}
						</Button>
					</ConfirmDestructiveActionDialog>
				: relationship.status === 'friends' ?
					<UserCheck className="w-6 h-6 p-0" />
				:	<> status is null for some reason</>}
			</div>
		</AvatarIconRow>
	)
}
