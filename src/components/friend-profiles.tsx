import { Link } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRelationFriends } from '@/hooks/use-friends'
import { Loader } from '@/components/ui/loader'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'

export function FriendProfiles() {
	const { data, isLoading } = useRelationFriends()
	return (
		<>
			<Card data-testid="friends-section">
				<CardHeader>
					<CardTitle>Your friends</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{isLoading ?
							<Loader />
						: !data?.length ?
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
						:	data?.map((f) => (
								<ProfileWithRelationship key={f.uid} uid={f.uid} />
							))
						}
					</div>
				</CardContent>
			</Card>
		</>
	)
}
