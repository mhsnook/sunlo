import { createFileRoute, Link } from '@tanstack/react-router'
import { Contact } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { useRelationInvitations } from '@/hooks/use-friends'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createFileRoute('/_user/friends/requests')({
	component: RouteComponent,
})

function RouteComponent() {
	const { data, isLoading } = useRelationInvitations()

	return !data?.length ?
			<p
				className={`text-muted-foreground mx-2 text-sm italic ${isLoading ? 'invisible' : ''}`}
			>
				No friend requests pending for you.
			</p>
		:	<Card>
				<CardHeader>
					<CardTitle>
						<div className="flex flex-row items-center justify-between">
							<span>Requests to connect</span>
							<Link
								to="/friends"
								aria-disabled="true"
								className={buttonVariants({
									size: 'sm',
									variant: 'outline',
								})}
							>
								<Contact className="size-3" />{' '}
								<span className="me-1">Friends list</span>
							</Link>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ?
						<Loader />
					:	data.map((r) => <ProfileWithRelationship key={r.uid} uid={r.uid} />)}
				</CardContent>
			</Card>
}
