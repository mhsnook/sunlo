import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import languages from '@/lib/languages'
import { deckQueryOptions } from '@/lib/use-deck'
import { reviewablesQueryOptions } from '@/lib/use-reviewables'
import { BookOpen, ChevronRight, Shuffle, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
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
		}
	},
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const { reviewableCards } = Route.useLoaderData()

	const reviewStats = {
		totalScheduled: reviewableCards?.length,
		totalNewCards: 15,
		fromFriends: 3,
		fromOwnDeck: 5,
		fromPublicLibrary: 17,
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Get Ready to review your {languages[lang]} cards</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground mb-4 max-w-2xl text-lg">
					Your personalized review session is prepared and waiting for you.
					Here's what to expect:
				</p>
				<div className="mb-8 grid gap-6 md:grid-cols-3">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-xl">
								Total Cards
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-orange-500">
								<BookOpen />
								{reviewStats.totalScheduled + reviewStats.totalNewCards}
							</p>
							<p className="text-muted-foreground">
								cards scheduled for review today
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xl">New Cards</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-green-500">
								<Shuffle />
								<span>{reviewStats.totalNewCards}</span>
							</p>
							<p className="text-muted-foreground">
								new cards will be introduced
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-xl">
								<Users className="h-5 w-5 text-purple-500" />
								Sources
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Friend recs:</span>
								<Badge variant="outline">{reviewStats.fromFriends}</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Your deck:</span>
								<Badge variant="outline">{reviewStats.fromOwnDeck}</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Public library:</span>
								<Badge variant="outline">{reviewStats.fromPublicLibrary}</Badge>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="flex flex-col justify-center gap-4 @lg:flex-row">
					<Link
						to="/learn/$lang/review/go"
						params={{ lang }}
						className={buttonVariants({ size: 'lg' })}
					>
						Okay, let's get started <ChevronRight className="ml-2 h-5 w-5" />
					</Link>
					<Button variant="outline" size="lg">
						Customize my session
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
