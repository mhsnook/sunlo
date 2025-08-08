import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Contact } from 'lucide-react'
import { Loader } from '../ui/loader'
import { ShowError } from '../errors'
import { ProfileWithRelationship } from '../profile-with-relationship'
import { useRelations } from '@/lib/friends'
import { buttonVariants } from '../ui/button-variants'

export function PendingInvitationsSection({ shy = false }: { shy?: boolean }) {
	const { data, isPending, error } = useRelations()

	return (
		!data?.uids.invitations?.length ?
			shy ? null
			:	<p
					className={`text-muted-foreground mx-2 text-sm italic ${isPending ? 'invisible' : ''}`}
				>
					No friend requests pending for you.
				</p>
		:	<Card>
				<CardHeader>
					<CardTitle>
						<div className="flex flex-row items-center justify-between">
							<span>Invitations to connect</span>
							<Link
								to="/friends"
								aria-disabled="true"
								className={buttonVariants({
									size: 'badge',
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
	)
}
