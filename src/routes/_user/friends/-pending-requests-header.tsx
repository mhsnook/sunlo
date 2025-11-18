import { Link } from '@tanstack/react-router'
import { useRelationInvitations } from '@/hooks/use-friends'
import { buttonVariants } from '@/components/ui/button-variants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function PendingRequestsHeader({ shy = false }) {
	const { data, isLoading } = useRelationInvitations()
	const requestsCount = data?.length
	return (
		!requestsCount ?
			shy ? null
			:	<p
					className={`text-muted-foreground mx-2 text-sm italic ${isLoading ? 'invisible' : ''}`}
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
					<Badge>{requestsCount}</Badge> pending friend{' '}
					{requestsCount === 1 ? 'request' : 'requests'}
				</Link>
			</div>
	)
}
