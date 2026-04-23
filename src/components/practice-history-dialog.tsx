import type { PhraseFullFilteredType } from '@/features/phrases/schemas'
import type { CardDirectionType } from '@/features/deck/schemas'
import type { CardReviewType } from '@/features/review/schemas'

import { cn } from '@/lib/utils'
import { ago } from '@/lib/dayjs'
import { dateDiff } from '@/lib/utils'
import { retrievability } from '@/features/review/fsrs'
import { useOneCardReviews } from '@/features/review/hooks'
import { useMyCard } from '@/features/deck/hooks'
import ExtraInfo from '@/components/extra-info'
import { LangBadge } from '@/components/ui/badge'

export default function PracticeHistoryDialog({
	phrase,
	direction = 'forward',
	open,
	onOpenChange,
}: {
	phrase: PhraseFullFilteredType
	direction?: CardDirectionType
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	return (
		<ExtraInfo
			title={phrase?.text ?? 'Card details'}
			description={
				direction === 'reverse' ? 'Stats for the reverse card' : undefined
			}
			open={open}
			onOpenChange={onOpenChange}
		>
			{open && phrase ? (
				<StatsContent phrase={phrase} direction={direction} />
			) : null}
		</ExtraInfo>
	)
}

function StatsContent({
	phrase,
	direction,
}: {
	phrase: PhraseFullFilteredType
	direction: CardDirectionType
}) {
	const { data: reviews } = useOneCardReviews(phrase.id, direction)
	const { data: card } = useMyCard(phrase.id)
	const hasReviews = Array.isArray(reviews) && reviews.length > 0
	const latest = hasReviews ? reviews.at(-1)! : null

	const retr =
		latest?.stability == null
			? null
			: retrievability(dateDiff(latest.created_at), latest.stability)

	return (
		<div className="space-y-6">
			<header className="flex items-center justify-between gap-3">
				<LangBadge lang={phrase.lang} />
				{card?.created_at ? (
					<span className="text-muted-foreground text-xs">
						Added to deck {ago(card.created_at)}
					</span>
				) : null}
			</header>

			{!hasReviews || !card ? (
				<p className="text-muted-foreground text-sm">
					{!card
						? "This phrase isn't in your deck yet."
						: "No reviews yet — it'll show up here after your first one."}
				</p>
			) : (
				<>
					{retr !== null && <RetrievabilityBar value={retr} />}

					<ReviewTimeline reviews={reviews} />

					<SummaryGrid
						reviews={reviews}
						latest={latest!}
						cardCreatedAt={card.created_at}
					/>
				</>
			)}
		</div>
	)
}

/* ── retrievability bar ─────────────────────────────────────────────── */

function RetrievabilityBar({ value }: { value: number }) {
	const pct = Math.round(value * 100)
	const color =
		pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'
	const label =
		pct >= 80
			? 'Still fresh in memory'
			: pct >= 50
				? 'Starting to fade'
				: 'Needs a refresh'
	return (
		<section className="space-y-2">
			<div className="flex items-baseline justify-between gap-2">
				<div className="flex flex-col">
					<span className="text-sm font-medium">Memory freshness</span>
					<span className="text-muted-foreground text-xs">{label}</span>
				</div>
				<span className="text-3xl font-bold tabular-nums">{pct}%</span>
			</div>
			<div className="bg-1-lo-neutral h-2 w-full overflow-hidden rounded-full">
				<div
					className={cn('h-full rounded-full transition-all', color)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</section>
	)
}

/* ── review timeline (score strip + aligned sparkline) ──────────────── */

const SCORE_BG: Record<number, string> = {
	1: 'bg-red-500',
	2: 'bg-amber-400',
	3: 'bg-green-500',
	4: 'bg-blue-500',
}
const SCORE_STROKE: Record<number, string> = {
	1: '#ef4444',
	2: '#f59e0b',
	3: '#22c55e',
	4: '#3b82f6',
}
const SCORE_LABEL: Record<number, string> = {
	1: 'Again',
	2: 'Hard',
	3: 'Good',
	4: 'Easy',
}

const SQ = 16
const GAP = 6
const SPARK_H = 32
const SPARK_PAD = 3
const DOT_R = 4
const D_MIN = 1
const D_MAX = 10

function ReviewTimeline({ reviews }: { reviews: Array<CardReviewType> }) {
	const withDifficulty = reviews
		.map((r, i) => ({ r, i }))
		.filter(
			(x): x is { r: CardReviewType & { difficulty: number }; i: number } =>
				typeof x.r.difficulty === 'number'
		)
	const showSparkline = withDifficulty.length >= 2
	const totalWidth = reviews.length * SQ + Math.max(reviews.length - 1, 0) * GAP

	const centerOf = (i: number) => SQ / 2 + i * (SQ + GAP)
	const yOf = (d: number) =>
		SPARK_PAD + (1 - (d - D_MIN) / (D_MAX - D_MIN)) * (SPARK_H - 2 * SPARK_PAD)

	const sparkPoints = withDifficulty.map(({ r, i }) => ({
		id: r.id,
		x: centerOf(i),
		y: yOf(r.difficulty),
		score: r.score,
	}))
	const pathD = sparkPoints
		.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
		.join(' ')

	const lastDifficulty = withDifficulty.at(-1)?.r.difficulty ?? null

	return (
		<section className="space-y-2">
			<div className="flex items-baseline justify-between">
				<h3 className="text-sm font-medium">Review history</h3>
				<span className="text-muted-foreground text-xs">
					{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
				</span>
			</div>

			<div className="flex flex-wrap gap-1.5">
				{reviews.map((r) => (
					<span
						key={r.id}
						className={cn('size-4 rounded', SCORE_BG[r.score] ?? 'bg-muted')}
						title={`${SCORE_LABEL[r.score] ?? 'Review'} · ${ago(r.created_at)}`}
					/>
				))}
			</div>

			{showSparkline && (
				<>
					<div className="flex items-baseline justify-between">
						<span className="text-muted-foreground text-xs">
							Difficulty trend
						</span>
						{lastDifficulty !== null && (
							<span className="text-muted-foreground text-xs">
								Currently {difficultyLabel(lastDifficulty)}
							</span>
						)}
					</div>
					<svg
						width={totalWidth}
						height={SPARK_H}
						viewBox={`0 0 ${totalWidth} ${SPARK_H}`}
						role="img"
						aria-label="Difficulty trend"
					>
						<path
							d={pathD}
							fill="none"
							stroke="oklch(0.55 0.12 300)"
							strokeWidth={1.5}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						{sparkPoints.map((p) => (
							<circle
								key={p.id}
								cx={p.x}
								cy={p.y}
								r={DOT_R}
								fill={SCORE_STROKE[p.score] ?? '#888'}
							/>
						))}
					</svg>
				</>
			)}
		</section>
	)
}

/* ── summary grid ───────────────────────────────────────────────────── */

function SummaryGrid({
	reviews,
	latest,
	cardCreatedAt,
}: {
	reviews: Array<CardReviewType>
	latest: CardReviewType
	cardCreatedAt: string
}) {
	const reviewSpanDays = dateDiff(cardCreatedAt)
	return (
		<section className="grid grid-cols-2 gap-3 text-sm">
			<StatTile label="Last reviewed" value={ago(latest.created_at) ?? '—'} />
			<StatTile label="Reviews total" value={String(reviews.length)} />
			<StatTile
				label="Difficulty"
				value={
					latest.difficulty == null ? '—' : difficultyLabel(latest.difficulty)
				}
			/>
			<StatTile
				label="Expected to remember for"
				value={
					latest.stability == null ? '—' : stabilityLabel(latest.stability)
				}
			/>
			<StatTile
				label="In your deck for"
				value={daysLabel(reviewSpanDays)}
				className="col-span-2"
			/>
		</section>
	)
}

function StatTile({
	label,
	value,
	className,
}: {
	label: string
	value: string
	className?: string
}) {
	return (
		<div
			className={cn(
				'bg-1-lo-neutral flex flex-col gap-0.5 rounded p-3',
				className
			)}
		>
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="font-semibold">{value}</span>
		</div>
	)
}

function difficultyLabel(d: number): string {
	const n = Math.round(d)
	const word = n <= 3 ? 'Easy' : n <= 6 ? 'Medium' : 'Hard'
	return `${word} (${n}/10)`
}

function stabilityLabel(days: number): string {
	if (days < 1) return 'less than a day'
	if (days < 2) return '~1 day'
	if (days < 14) return `~${Math.round(days)} days`
	if (days < 60) return `~${Math.round(days / 7)} weeks`
	return `~${Math.round(days / 30)} months`
}

function daysLabel(days: number): string {
	if (days < 1) return 'less than a day'
	if (days < 2) return '1 day'
	if (days < 60) return `${Math.round(days)} days`
	if (days < 365) return `${Math.round(days / 30)} months`
	return `${(days / 365).toFixed(1)} years`
}
