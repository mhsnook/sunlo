import { createFileRoute } from '@tanstack/react-router'

import Callout from '@/components/ui/callout'
import { useProfile } from '@/hooks/use-profile'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { uuid } from '@/types/main'

type FriendsSearchParams = {
	uid: uuid
}

export const Route = createFileRoute('/_user/friends/search/$uid')({
	component: FriendRequestWithUIDPage,
})

function FriendRequestWithUIDPage() {
	const { data: profile } = useProfile()
	const { uid }: FriendsSearchParams = Route.useParams()
	const { data: otherProfile } = useOnePublicProfile(uid)

	return !otherProfile || !profile ?
			null
		:	<Callout>
				<div className="w-full space-y-4">
					<p>
						<strong>Welcome {profile.username}!</strong> You were invited by
						user <em>{otherProfile.username}</em>. Now that you've joined, you
						can send them an invitation to connect.
					</p>
					<div className="rounded border px-4 py-3 @xl:px-6">
						<ProfileWithRelationship uid={otherProfile.uid} />
					</div>
					<p>
						Or, use this page to search for friends and get started learning
						together.
					</p>
				</div>
			</Callout>
}
