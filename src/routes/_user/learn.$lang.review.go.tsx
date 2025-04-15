import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { TitleBar } from '@/types/main'
import { FlashCardReviewSession } from '@/components/flash-card-review-session'
import languages from '@/lib/languages'
import { deckQueryOptions } from '@/lib/use-deck'
import { reviewablesQueryOptions } from '@/lib/use-reviewables'
import { BookHeart } from 'lucide-react'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	component: ReviewPage,
	loader: async ({
		params: { lang },
		context: {
			queryClient,
			auth: { userId },
		},
	}) => {
		if (!userId) throw new Error('No userId present, for some reason')
		const promise1 = queryClient.fetchQuery(deckQueryOptions(lang, userId))
		const promise2 = queryClient.fetchQuery(
			reviewablesQueryOptions(lang, userId)
		)
		const data = {
			deck: await promise1,
			reviewables: await promise2,
		}
		console.log(`preparing today's review`, data)
		return {
			reviewableCards: data.reviewables.map(
				(r) => data.deck.cardsMap[r.phrase_id!]
			),
			appnav: [],
			contextMenu: [
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
				'/learn/$lang/deck-settings',
			],
			titleBar: {
				title: `Review ${languages[lang]} cards`,
				Icon: BookHeart,
			} as TitleBar,
		}
	},
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const { reviewableCards } = Route.useLoaderData()
	return reviewableCards.length === 0 ?
			<Empty lang={lang} />
		:	<FlashCardReviewSession cards={reviewableCards} lang={lang} />
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
