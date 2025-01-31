import { createFileRoute, Link } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { useRelations } from '@/lib/friends'
import { ShowError } from '@/components/errors'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'

export const Route = createFileRoute('/_user/friends/')({
	component: FriendListPage,
})

function FriendListPage() {
	return (
		<main className="flex flex-col gap-6">
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
				<CardTitle>Friend requests sent</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{isPending ?
					<Loader />
				: error ?
					<ShowError>{error.message}</ShowError>
				: !(data?.uids.invited.length > 0) ?
					<p>You don't have any requests pending at this time.</p>
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

function FriendProfiles() {
	const { data, isPending, error } = useRelations()
	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Your friends</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{isPending ?
							<Loader />
						: error ?
							<></>
						: !(data?.uids.friends?.length > 0) ?
							<p>
								Your friends list is empty for now. Use{' '}
								<Link
									className="s-link"
									from={Route.fullPath}
									to="/friends/search"
								>
									the search screen
								</Link>{' '}
								to find friends on Sunlo or{' '}
								<Link
									className="s-link"
									from={Route.fullPath}
									to="/friends/invite"
								>
									invite them to create an account
								</Link>
								.
							</p>
						:	data?.uids.friends.map((uid) => (
								<ProfileWithRelationship
									key={uid}
									profile={data?.relationsMap[uid].profile}
								/>
							))
						}
					</div>
				</CardContent>
			</Card>
		</>
	)
}
