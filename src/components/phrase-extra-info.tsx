import { CardFull, uuid } from '@/types/main'
import { ago } from '@/lib/dayjs'
import { useLanguagePhrase } from '@/lib/use-language'
import { useDeckCard } from '@/lib/use-deck'
import { dateDiff, intervals, retrievability, roundAndTrim } from '@/lib/utils'
import Flagged from '@/components/flagged'
import ExtraInfo from '@/components/extra-info'

export default function PhraseExtraInfo({
	pid,
	lang,
	className,
}: {
	pid: uuid
	lang: string
	className?: string
}) {
	const phrase = useLanguagePhrase(pid, lang)
	const card = useDeckCard(pid, lang)

	return !phrase.data ? null : (
			<ExtraInfo
				title="User card details"
				description={`“${phrase.data.text}”`}
				className={className}
			>
				<div className="block space-y-4">
					<div className="flex flex-col">
						<span className="font-semibold">Phrase ID</span>
						<span>{phrase.data.id}</span>
					</div>
					<div className="flex flex-col">
						<span className="font-semibold">Phrase created at</span>
						<span>{ago(phrase.data.created_at)}</span>
					</div>
				</div>
				{!card.data ?
					<p>Phrase has no card in your deck</p>
				:	<CardSection card={card.data} />}
			</ExtraInfo>
		)
}

function CardSection({ card }: { card: CardFull }) {
	const reviews =
		card?.reviews.sort((a, b) =>
			a.created_at > b.created_at ? -1
			: a.created_at < b.created_at ? 1
			: 0
		) ?? []
	const rev = reviews[0] || null
	const retr =
		card.last_reviewed_at && card.stability ?
			retrievability(card.last_reviewed_at, card.stability)
		:	0
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
			{!card.last_reviewed_at || !reviews.length ?
				<p>Never reviewed</p>
			:	<>
					<div className="flex flex-col">
						<span className="font-semibold">
							Recentest of {reviews.length} reviews
						</span>
						<span>{ago(card.last_reviewed_at)}</span>
					</div>
					<div className="flex flex-col">
						<span className="font-semibold">Card current variables:</span>
						<span>
							Difficulty{' '}
							{rev?.difficulty ? roundAndTrim(rev.difficulty) : 'N/A'},
							Stability {rev?.stability ? roundAndTrim(rev.stability) : 'N/A'},{' '}
							{roundAndTrim(dateDiff(rev.created_at), 1)} days since last
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
					{reviews.map((r) => (
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
