import { Link } from '@tanstack/react-router'
import { useRelations } from '@/lib/friends'
import { buttonVariants } from '../ui/button-variants'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

export function PendingRequestsHeader({ shy = false }) {
	const { data, isPending } = useRelations()
	return (
		!data?.uids.invitations?.length ?
			shy ? null
			:	<p
					className={`text-muted-foreground mx-2 text-sm italic ${isPending ? 'invisible' : ''}`}
				>
					No friend requests pending for you.
				</p>
		:	<div>
				<Link
					className={cn(
						buttonVariants({ variant: 'ghost' }),
						'grow-0 justify-start'
					)}
					to="/friends/requests"
				>
					<Badge>{data.uids.invitations.length}</Badge> pending friend requests
				</Link>
			</div>
	)
}
