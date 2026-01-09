import { Check, Send, ThumbsUp, UserCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvatarIconRow } from '@/components/ui/avatar-icon'
import { ConfirmDestructiveActionDialog } from '@/components/confirm-destructive-action-dialog'
import { useFriendRequestAction } from '@/hooks/use-friends'
import { IconSizedLoader } from '@/components/ui/loader'
import { uuid } from '@/types/main'
import { useOnePublicProfile } from '@/hooks/use-public-profile'

export function ProfileWithRelationship({ uid }: { uid: uuid }) {
	const { data: profile } = useOnePublicProfile(uid)
	const inviteResponseMutation = useFriendRequestAction(uid)
	const isMostRecentByThem = profile?.relation?.most_recent_uid_by === uid

	return !profile ? null : (
			<AvatarIconRow {...profile}>
				<div className="flex flex-row gap-2">
					{inviteResponseMutation.isPending ?
						<IconSizedLoader />
					: inviteResponseMutation.isSuccess ?
						<span className="rounded-squircle size-8 rounded-full bg-green-600 p-1">
							<Check className="size-6 text-white" />
						</span>
					: !profile.relation || profile.relation.status === 'unconnected' ?
						<Button
							variant="default"
							className="size-8"
							size="icon"
							title="Send friend request"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => inviteResponseMutation.mutate('invite')}
						>
							<Send className="mt-[0.1rem] mr-[0.1rem] size-6" />
						</Button>
					: profile.relation.status === 'pending' && isMostRecentByThem ?
						<>
							<Button
								variant="default"
								className="size-8"
								size="icon"
								title="Accept pending invitation"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
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
									// oxlint-disable-next-line jsx-no-new-function-as-prop
									onClick={() => inviteResponseMutation.mutate('decline')}
								>
									{inviteResponseMutation.isPending ?
										<IconSizedLoader />
									: inviteResponseMutation.isSuccess ?
										<Check className="size-6 text-white" />
									:	<>Confirm</>}
								</Button>
							</ConfirmDestructiveActionDialog>
						</>
					: profile.relation?.status === 'pending' && !isMostRecentByThem ?
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
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => inviteResponseMutation.mutate('cancel')}
							>
								{inviteResponseMutation.isPending ?
									<IconSizedLoader />
								: inviteResponseMutation.isSuccess ?
									<Check className="size-6 text-white" />
								:	<>Confirm</>}
							</Button>
						</ConfirmDestructiveActionDialog>
					: profile.relation.status === 'friends' ?
						<UserCheck className="size-6 p-0" />
					:	<> status is "{profile.relation.status}" for some reason</>}
				</div>
			</AvatarIconRow>
		)
}
