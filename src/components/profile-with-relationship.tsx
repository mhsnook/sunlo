import { Check, Send, ThumbsUp, UserCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvatarIconRow } from '@/components/ui/avatar-icon'
import { ConfirmDestructiveActionDialog } from '@/components/confirm-destructive-action-dialog'
import { useFriendRequestAction } from '@/features/social/hooks'
import { IconSizedLoader } from '@/components/ui/loader'
import { uuid } from '@/types/main'
import { useOnePublicProfile } from '@/features/social/public-profile'

export function ProfileWithRelationship({ uid }: { uid: uuid }) {
	const { data: profile } = useOnePublicProfile(uid)
	const friendRequest = useFriendRequestAction(uid)
	const isMostRecentByThem = profile?.relation?.most_recent_uid_by === uid

	return !profile ? null : (
		<AvatarIconRow {...profile}>
			<div className="relative flex flex-row gap-2">
				{friendRequest.isPending ? (
					<IconSizedLoader />
				) : !profile.relation || profile.relation.status === 'unconnected' ? (
					<Button
						variant="default"
						className="size-8"
						size="icon"
						aria-label="Send friend request"
						onClick={() => friendRequest.act('invite')}
					>
						<Send className="mt-[0.1rem] mr-[0.1rem] size-6" />
					</Button>
				) : profile.relation.status === 'pending' && isMostRecentByThem ? (
					<>
						<Button
							variant="default"
							className="size-8"
							size="icon"
							aria-label="Accept pending invitation"
							onClick={() => friendRequest.act('accept')}
						>
							<ThumbsUp />
						</Button>
						<ConfirmDestructiveActionDialog
							title="Decline this invitation"
							description="Please confirm whether you'd like to decline this invitation"
						>
							<Button
								variant="neutral"
								className="size-8"
								size="icon"
								aria-label="Decline pending invitation"
							>
								<X className="size-6 p-0" />
							</Button>
							<Button
								variant="red"
								aria-label="Confirm: Decline friend request"
								onClick={() => friendRequest.act('decline')}
							>
								Confirm
							</Button>
						</ConfirmDestructiveActionDialog>
					</>
				) : profile.relation?.status === 'pending' && !isMostRecentByThem ? (
					<ConfirmDestructiveActionDialog
						title={`Cancel this request`}
						description={`Please confirm whether you'd like to cancel this friend request`}
					>
						<Button
							variant="neutral"
							className="size-8"
							size="icon"
							aria-label="Cancel friend request"
						>
							<X className="size-6 p-0" />
						</Button>
						<Button
							variant="red"
							aria-label="Confirm: Cancel friend request"
							onClick={() => friendRequest.act('cancel')}
						>
							Confirm
						</Button>
					</ConfirmDestructiveActionDialog>
				) : profile.relation.status === 'friends' ? (
					<UserCheck className="size-6 p-0" />
				) : (
					<> status is "{profile.relation.status}" for some reason</>
				)}
				{/* The row underneath has already settled into the new status. This
				    marks the moment it changed, then gets out of the way. Keyed by
				    the action so a second one replays it. */}
				{friendRequest.lastAction ? (
					<span
						key={friendRequest.lastAction}
						aria-hidden
						className="animate-out fade-out zoom-out-75 fill-mode-forwards pointer-events-none absolute inset-0 flex items-center delay-700 duration-500"
					>
						<span className="rounded-squircle size-8 rounded-full bg-green-600 p-1">
							<Check className="size-6 text-white" />
						</span>
					</span>
				) : null}
			</div>
		</AvatarIconRow>
	)
}
