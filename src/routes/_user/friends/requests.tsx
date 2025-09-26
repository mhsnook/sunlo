import { createFileRoute, Link } from '@tanstack/react-router'
import { Contact } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowError } from '@/components/errors'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { useRelations } from '@/hooks/use-friends'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createFileRoute('/_user/friends/requests')({
	component: RouteComponent,
})

function RouteComponent() {
	const { data, isPending, error } = useRelations()

	return !data?.uids.invitations?.length ?
			<p
				className={`text-muted-foreground mx-2 text-sm italic ${isPending ? 'invisible' : ''}`}
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
					{isPending ?
						<Loader />
					: error ?
						<ShowError>{error.message}</ShowError>
					:	data?.uids.invitations.map((uid) => (
							<ProfileWithRelationship
								key={uid}
								// @TODO replace this with just passing the UID and have the
								// component grab the relationship from a use-query+selector
								profile={data?.relationsMap[uid].profile}
							/>
						))
					}
				</CardContent>
			</Card>
}
