import { Link } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRelations } from '@/hooks/use-friends'
import { Loader } from '@/components/ui/loader'
import { ShowError } from '@/components/errors'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'

export function FriendProfiles() {
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
							<ShowError>{error.message}</ShowError>
						: !data?.uids.friends?.length ?
							<p>
								Your friends list is empty for now. Use{' '}
								<Link className="s-link" to="/friends/search">
									the search screen
								</Link>{' '}
								to find friends on Sunlo or{' '}
								<Link className="s-link" to="/friends/invite">
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
