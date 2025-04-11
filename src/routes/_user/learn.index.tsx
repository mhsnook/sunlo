import { createFileRoute, Link } from '@tanstack/react-router'
import { Star, Users } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useProfile } from '@/lib/use-profile'
import { ago } from '@/lib/dayjs'
import Flagged from '@/components/flagged'

export const Route = createFileRoute('/_user/learn/')({
	component: Page,
})

export default function Page() {
	const { data: profile, isPending } = useProfile()
	return (
		<main className="grid gap-4 @lg:grid-cols-2">
			{isPending ?
				<Loader />
			:	Object.entries(profile?.decksMap ?? []).map(([key, deck]) => (
					<Link
						key={key}
						to="/learn/$lang"
						params={{ lang: key }}
						className="block rounded-lg transition-transform focus:ring-blue-500 focus:ring-offset-1 focus:outline-blue-500"
					>
						<Card
							key={deck.language}
							className="hover:border-primary h-full overflow-hidden"
						>
							<CardHeader className="bg-primary dark text-white">
								<CardTitle>
									{deck.language}{' '}
									<span className="text-muted-foreground text-xs">{key}</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 p-4">
								<div>
									<p className="text-muted-foreground text-sm">
										{deck.cards_active} active cards
									</p>
									<p className="text-muted-foreground text-sm">
										Last studied:{' '}
										{deck.most_recent_review_at ?
											ago(deck.most_recent_review_at)
										:	'never'}
									</p>
								</div>

								<Flagged
									name="deck_metadata_on_cards"
									className="flex items-center justify-between"
								>
									<div className="flex items-center space-x-1">
										<Users className="text-info size-4" />
										<span className="text-sm">{0} friends studying</span>
									</div>
									<div className="flex items-center space-x-1">
										<Star className="text-warning size-4" />
										<span className="text-sm">{4.5}</span>
									</div>
								</Flagged>
							</CardContent>
						</Card>
					</Link>
				))
			}
		</main>
	)
}
