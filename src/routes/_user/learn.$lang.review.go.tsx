import { createFileRoute, Link, useLoaderData } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { FlashCardReviewSession } from '@/components/flash-card-review-session'
import languages from '@/lib/languages'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	component: ReviewPage,
	loader: () => {
		return {
			appnav: [],
		}
	},
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const { deck } = useLoaderData({ from: '/_user/learn/$lang' })
	const desiredRetention = 0.9
	const desiredNewCardCount = 15
	const reviewableCards = [
		...deck.pids.reviewed.filter((pid) => {
			const card = deck.cardsMap[pid]
			return (
				card.retrievability_now !== null &&
				card.retrievability_now <= desiredRetention
			)
		}),
		...deck.pids.unreviewed
			.sort((a, b) => {
				const cardA = deck.cardsMap[a]
				const cardB = deck.cardsMap[b]
				return (
					cardB.created_at! > cardA.created_at! ? 1
					: cardB === cardA ? 0
					: -1
				)
			})
			.slice(0, desiredNewCardCount),
	]
	return reviewableCards.length === 0 ?
			<Empty lang={lang} />
		:	<FlashCardReviewSession
				cards={reviewableCards.map((p) => deck.cardsMap[p])}
				lang={lang}
			/>
}

const Empty = ({ lang }: { lang: string }) => (
	<Card className="px-[5%] py-6">
		<CardHeader className="my-6 opacity-70">
			<CardTitle>No cards to review</CardTitle>
		</CardHeader>
		<CardContent className="mb-6 space-y-4">
			<p>
				This is empty because there are no active cards in your{' '}
				{languages[lang]} deck.
			</p>
			<p>
				You can{' '}
				<Link
					className="s-link"
					to="/learn/$lang/library"
					params={{ lang }}
					from={Route.fullPath}
				>
					browse the library
				</Link>{' '}
				to find new phrases to learn, or{' '}
				<Link
					className="s-link"
					to="/learn/$lang/add-phrase"
					params={{ lang }}
					from={Route.fullPath}
				>
					add your own
				</Link>
				!
			</p>
		</CardContent>
	</Card>
)
