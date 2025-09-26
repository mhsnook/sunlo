import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { useRelations } from '@/hooks/use-friends'
import { ShowError } from '@/components/errors'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { PendingRequestsHeader } from '@/routes/_user/friends/-pending-requests-header'
import { FriendProfiles } from '@/components/friend-profiles'

export const Route = createFileRoute('/_user/friends/')({
	component: FriendListPage,
})

function FriendListPage() {
	return (
		<main className="flex flex-col gap-4">
			<PendingRequestsHeader />
			<FriendProfiles />
			<PendingRequestsSection />
		</main>
	)
}

function PendingRequestsSection() {
	const { data, isPending, error } = useRelations()

	return (
		<Card>
			<CardHeader>
				<CardTitle>Friend invites sent</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{isPending ?
					<Loader />
				: error ?
					<ShowError>{error.message}</ShowError>
				: !data?.uids.invited.length ?
					<p>You don't have any invites pending at this time.</p>
				:	data.uids.invited.map((uid) => (
						<ProfileWithRelationship
							key={uid}
							profile={data?.relationsMap[uid].profile}
						/>
					))
				}
			</CardContent>
		</Card>
	)
}
