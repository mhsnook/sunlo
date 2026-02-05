import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { SuccessCheckmark } from '@/components/success-checkmark'
import {
	useReviewActions,
	useReviewStage,
	useReviewLang,
	useReviewDayString,
} from '@/hooks/use-review-store'
import { useReviewsTodayStats } from '@/hooks/use-reviews'
import { Link } from '@tanstack/react-router'
import { BarChart3, Plus, Newspaper, Search } from 'lucide-react'

export function WhenComplete() {
	const lang = useReviewLang()
	const dayString = useReviewDayString()
	const stage = useReviewStage()
	const actions = useReviewActions()
	const { data: stats } = useReviewsTodayStats(lang, dayString)
	if (!stats) return null

	const showWhich =
		stats.unreviewed && stage < 2 ? 'a'
		: stats.again && stage < 4 ? 'b'
		: 'c'

	return (
		<Card
			className="mx-auto flex min-h-[80vh] w-full flex-col items-center justify-center pt-12"
			data-testid="review-complete-page"
		>
			<CardContent className="flex grow flex-col justify-center gap-6">
				{showWhich === 'a' ?
					<>
						<CardTitle className="text-center">Step 2 of 3</CardTitle>
						<p className="text-center text-lg">
							You've completed your first pass, but there{' '}
							{stats.unreviewed === 1 ?
								'is still 1 card'
							:	`are still ${stats.unreviewed} cards`}{' '}
							you haven't reviewed yet. Let's go back and finish them &mdash;
							you can do it!
						</p>
						<Button
							size="lg"
							onClick={() => {
								actions.gotoReviewUnreviewed(stats.firstUnreviewedIndex)
							}}
						>
							Review Skipped cards ({stats.unreviewed})
						</Button>
						<Button
							size="lg"
							variant="secondary"
							onClick={actions.skipReviewUnreviewed}
						>
							Skip step 2
						</Button>
					</>
				: showWhich === 'b' ?
					<>
						<CardTitle className="text-center">Step 3 of 3</CardTitle>
						<p className="text-center text-lg">
							There
							{stats.again === 1 ? ' is 1 card ' : ` are ${stats.again} cards `}
							that you weren't able to recall the first time and asked to see
							again.
						</p>
						<Button
							size="lg"
							onClick={() => {
								actions.gotoReviewAgains(stats.firstAgainIndex)
							}}
						>
							Review cards ({stats.again})
						</Button>
						<div>
							<p className="mb-2">
								If these are new cards and you're trying to make these memories
								for the first time, you might want to try one of these tricks:
							</p>
							<ol className="ms-6 list-decimal space-y-2">
								<li>
									Get out a paper and pencil and write the phrase down or draw a
									doodle.
								</li>
								<li>Think of a mnemonic device or a rhyme.</li>
								<li>
									Imagine cartoon character or a funny animal saying the phrase.
								</li>
							</ol>
						</div>
						<p>
							All of these can help you commit the phrase to useable memory
							&ndash; and as always, don't forget to say the phrase outloud! Use
							as many senses as you can.
						</p>
						<Button
							variant="secondary"
							size="lg"
							onClick={actions.skipReviewAgains}
						>
							Skip step 3
						</Button>
					</>
				:	<div className="flex h-full flex-col items-center justify-center gap-6 pb-16">
						<SuccessCheckmark />
						<CardTitle className="text-center">Review Complete!</CardTitle>
						<p className="text-muted-foreground text-center">
							You reviewed {stats.reviewed} card
							{stats.reviewed === 1 ? '' : 's'} today.
						</p>
						{stats.firstTryTotal > 0 && (
							<p className="text-muted-foreground text-center">
								<span className="text-primary font-medium">
									{stats.firstTrySuccess}
								</span>{' '}
								recalled on first try
								<span className="text-primary font-medium">
									{' '}
									(
									{Math.round(
										(stats.firstTrySuccess / stats.firstTryTotal) * 100
									)}
									%)
								</span>
								{stats.complete > stats.firstTrySuccess && (
									<>
										, {stats.complete} total
										<span className="text-primary font-medium">
											{' '}
											({Math.round((stats.complete / stats.reviewed) * 100)}%)
										</span>
									</>
								)}
							</p>
						)}

						<div className="mt-4 grid w-full max-w-sm gap-3">
							<Link
								to="/learn/$lang/feed"
								params={{ lang }}
								className={buttonVariants({ variant: 'default', size: 'lg' })}
							>
								<Newspaper className="mr-2 h-4 w-4" />
								Back to Feed
							</Link>
							<Link
								to="/learn/$lang/phrases/new"
								params={{ lang }}
								className={buttonVariants({ variant: 'secondary', size: 'lg' })}
							>
								<Plus className="mr-2 h-4 w-4" />
								Add New Phrase
							</Link>
							<div className="flex gap-3">
								<Link
									to="/learn/$lang/stats"
									params={{ lang }}
									className={buttonVariants({
										variant: 'outline',
										size: 'lg',
										className: 'flex-1',
									})}
								>
									<BarChart3 className="mr-2 h-4 w-4" />
									Stats
								</Link>
								<Link
									to="/learn/browse"
									className={buttonVariants({
										variant: 'outline',
										size: 'lg',
										className: 'flex-1',
									})}
								>
									<Search className="mr-2 h-4 w-4" />
									Browse
								</Link>
							</div>
						</div>
					</div>
				}
			</CardContent>
		</Card>
	)
}
