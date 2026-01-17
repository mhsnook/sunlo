import { MessageCircleWarningIcon } from 'lucide-react'
import Callout from '@/components/ui/callout'
import { buttonVariants } from '@/components/ui/button-variants'
import { Link } from '@tanstack/react-router'

export function NotEnoughCards({
	lang,
	countNeeded,
	newCardsCount,
	totalCards,
}: {
	lang: string
	countNeeded: number
	newCardsCount: number
	totalCards: number
}) {
	const noCards = totalCards === 0
	return (
		<Callout variant="ghost" Icon={MessageCircleWarningIcon}>
			<p>
				It looks like you don't have {noCards ? 'any ' : 'enough new '} cards
				{noCards ?
					" to review. You'll have to add at least a few before you can proceed"
				:	<>
						{' '}
						in your deck to meet your goal of{' '}
						<strong className="italic">{countNeeded} new cards a day</strong>
					</>
				}
				.
			</p>
			<div className="my-2 flex flex-col gap-2 @lg:flex-row">
				<Link
					className={buttonVariants({ variant: 'outline' })}
					to="/learn/$lang/feed"
					params={{ lang }}
				>
					Browse Requests feed to see what others are learning
				</Link>

				<Link
					className={buttonVariants({ variant: 'outline' })}
					to="/learn/$lang/phrases/new"
					params={{ lang }}
				>
					Create new cards
				</Link>
			</div>
			{noCards ? null : (
				<>
					Or click the big button below and get started with the {newCardsCount}{' '}
					cards you have.
				</>
			)}
		</Callout>
	)
}
