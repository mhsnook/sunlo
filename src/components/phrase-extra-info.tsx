import type { CardMetaType, PhraseFullFilteredType } from '@/lib/schemas'

import { ago } from '@/lib/dayjs'
import { dateDiff, intervals, retrievability, roundAndTrim } from '@/lib/utils'
import Flagged from '@/components/flagged'
import ExtraInfo from '@/components/extra-info'
import { useOneCardReviews } from '@/hooks/use-reviews'

export default function PhraseExtraInfo({
	phrase,
	className,
	link,
}: {
	phrase: PhraseFullFilteredType
	className?: string
	link?: boolean
}) {
	return !phrase ? null : (
			<ExtraInfo
				title="User card details"
				description={`“${phrase.text}”`}
				className={className}
				link={link}
			>
				<div className="block space-y-4">
					<div className="flex flex-col">
						<span className="font-semibold">Phrase ID</span>
						<span>{phrase.id}</span>
					</div>
					<div className="flex flex-col">
						<span className="font-semibold">Phrase created at</span>
						<span>{ago(phrase.created_at)}</span>
					</div>
				</div>
				{!phrase.card ?
					<p>Phrase has no card in your deck</p>
				:	<CardSection card={phrase.card} />}
			</ExtraInfo>
		)
}

function CardSection({ card }: { card: CardMetaType }) {
	const { data: reviews } = useOneCardReviews(card.phrase_id)
	const neverReviewed =
		!reviews || !Array.isArray(reviews) || reviews.length === 0

	const rev = reviews?.at(-1) ?? null
	const retr =
		neverReviewed ? 0 : retrievability(rev!.created_at, rev!.stability!)

	return (
		<div className="block space-y-4">
			<div className="flex flex-col">
				<span className="font-semibold">Card Phrase ID</span>
				<span>{card.phrase_id}</span>
			</div>
			<div className="flex flex-col">
				<span className="font-semibold">Card created at</span>
				<span>{ago(card.created_at)}</span>
			</div>
			{neverReviewed ?
				<p>Never reviewed</p>
			:	<>
					<div className="flex flex-col">
						<span className="font-semibold">
							Recentest of {reviews.length} reviews
						</span>
						<span>{ago(rev!.created_at)}</span>
					</div>
					<div className="flex flex-col">
						<span className="font-semibold">Card current variables:</span>
						<span>
							Difficulty {roundAndTrim(rev!.difficulty!)}, Stability{' '}
							{roundAndTrim(rev!.stability!)},{' '}
							{roundAndTrim(dateDiff(rev!.created_at), 1)} days since last
							review.
						</span>
						<span>
							Expected retrievability if reviewed now: {Math.round(retr * 100)}%
						</span>
						<span>
							Interval spread for a review this minute:{' '}
							{intervals()
								.map((i) => roundAndTrim(i))
								.join(', ')}
						</span>
					</div>
				</>
			}

			<div className="flex flex-col">
				<ul className="space-y-2">
					{reviews?.map((r) => (
						<li key={r.id} className="hover:bg-background/20 border p-2">
							<p className="text-muted-foreground font-semibold">
								{ago(r.created_at)}
							</p>
							<p>
								Expected R:{' '}
								{r.review_time_retrievability ?
									roundAndTrim(r.review_time_retrievability)
								:	'N/A'}
							</p>
							<p>
								Difficulty: {r.difficulty ? roundAndTrim(r.difficulty) : 'N/A'}
							</p>
							<p>
								Stability: {r.stability ? roundAndTrim(r.stability) : 'N/A'}{' '}
								from{' '}
							</p>
							<span>
								score: {r.score}
								<Flagged name="client_side_fsrs_scheduling">
									<>{/*next due {ago(r.scheduled_for)}*/}</>
								</Flagged>
							</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
