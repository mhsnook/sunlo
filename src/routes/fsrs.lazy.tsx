import { createLazyFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
	calculateFSRS,
	calculateInterval,
	retrievability,
	type Score,
} from '@/features/review/fsrs'
import { type CardReviewType } from '@/features/review/schemas'
import { cn } from '@/lib/utils'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export const Route = createLazyFileRoute('/fsrs')({
	component: FsrsPage,
})

// ---------------------------------------------------------------------------
// Tweakable defaults — change these to reshape the demo curve.
// Everything below is derived from the real FSRS v5 functions in
// src/features/review/fsrs.ts (retrievability + calculateFSRS), so the decay
// you see here is exactly what the scheduler uses.
// ---------------------------------------------------------------------------

const DEFAULTS = {
	/** The grade of each review, in order. 1=Again 2=Hard 3=Good 4=Easy. The
	 *  first entry is the initial learning grade. */
	scores: [1, 3, 2, 3, 3] as Array<Score>,
	/** Retention the scheduler aims for. The card "comes back around" the moment
	 *  its recall probability decays to this value — 0.9 = 90%. */
	desiredRetention: 0.9,
	/** Bottom of the Y axis. 0.7 = the chart starts at 70% retention. */
	yMin: 0.7,
} as const

const PRESETS: Array<{ label: string; scores: Array<Score> }> = [
	{ label: 'All Good', scores: [3, 3, 3, 3, 3] },
	{ label: 'Struggling', scores: [1, 3, 2, 3, 3] },
	{ label: 'Mid-lapse', scores: [3, 3, 3, 1, 3] },
	{ label: 'Quick learner', scores: [4, 4, 4, 4] },
]

// Per-score presentation, matching the review buttons' raw palette colors
// (see review-single-card.tsx): Again=red, Hard=gray, Good=blue, Easy=green.
// Full literal class strings so Tailwind picks them up.
const SCORE_META: Record<
	Score,
	{ label: string; glyph: string; text: string; activeBtn: string }
> = {
	1: {
		label: 'Again',
		glyph: '✕',
		text: 'text-red-600',
		activeBtn: 'bg-red-600 border-red-600 text-white',
	},
	2: {
		label: 'Hard',
		glyph: '○',
		text: 'text-gray-400',
		activeBtn: 'bg-gray-200 border-gray-300 text-gray-700',
	},
	3: {
		label: 'Good',
		glyph: '●',
		text: 'text-blue-500',
		activeBtn: 'bg-blue-500 border-blue-500 text-white',
	},
	4: {
		label: 'Easy',
		glyph: '◆',
		text: 'text-green-500',
		activeBtn: 'bg-green-500 border-green-500 text-white',
	},
}

// SVG geometry (in viewBox units)
const VB = { w: 820, h: 520 }
const PAD = { top: 56, right: 48, bottom: 64, left: 76 }
const PLOT = {
	w: VB.w - PAD.left - PAD.right,
	h: VB.h - PAD.top - PAD.bottom,
}
const SAMPLES_PER_SEGMENT = 80

// ---------------------------------------------------------------------------
// Simulation — drive the real FSRS functions through a sequence of reviews.
// Each review fires exactly when retrievability decays to `desiredRetention`,
// resetting recall to 100% and re-shaping the next interval according to the
// grade: a lapse (Again) collapses stability so the next curve is short and
// steep; an Easy stretches it far out.
// ---------------------------------------------------------------------------

interface Segment {
	index: number
	score: Score
	/** Day this review happened (curve = 100% here). */
	startDay: number
	/** Day the next review is scheduled (curve = desiredRetention here). */
	endDay: number
	stability: number
	difficulty: number
}

function simulateReviews(
	scores: Array<Score>,
	desiredRetention: number
): Array<Segment> {
	const BASE = new Date('2025-01-01T00:00:00Z')
	const atDay = (d: number) => new Date(BASE.getTime() + d * 86_400_000)

	const segments: Array<Segment> = []
	let previousReview: CardReviewType | undefined = undefined
	let day = 0

	scores.forEach((score, i) => {
		const { difficulty, stability } = calculateFSRS({
			score,
			previousReview,
			currentTime: atDay(day),
			desiredRetention,
		})

		// Exact (fractional) time until recall decays to the target retention.
		const interval = calculateInterval(desiredRetention, stability)

		segments.push({
			index: i,
			score,
			startDay: day,
			endDay: day + interval,
			stability,
			difficulty,
		})

		// Minimal review record to feed the next iteration's calculateFSRS —
		// it only reads created_at, difficulty, and stability off the previous
		// review, so the rest of CardReviewType is irrelevant to the simulation.
		previousReview = {
			created_at: atDay(day).toISOString(),
			difficulty,
			stability,
		} as CardReviewType

		day += interval
	})

	return segments
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

function buildPath(points: Array<[number, number]>): string {
	return points
		.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
		.join(' ')
}

/** A grade marker centered at (x, y). Color comes from the parent <g>. */
function ScoreGlyph({ score, x, y }: { score: Score; x: number; y: number }) {
	if (score === 1) {
		const s = 5.5
		return (
			<g stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
				<line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
				<line x1={x - s} y1={y + s} x2={x + s} y2={y - s} />
			</g>
		)
	}
	if (score === 2)
		return (
			<circle
				cx={x}
				cy={y}
				r={5}
				fill="none"
				stroke="currentColor"
				strokeWidth={2.5}
			/>
		)
	if (score === 4)
		return (
			<polygon
				points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`}
				fill="currentColor"
			/>
		)
	// score 3 — Good
	return <circle cx={x} cy={y} r={4.5} fill="currentColor" />
}

function ForgettingCurveChart({
	scores,
	desiredRetention,
	yMin,
}: {
	scores: Array<Score>
	desiredRetention: number
	yMin: number
}) {
	const { segments, dayMax } = useMemo(() => {
		const segs = simulateReviews(scores, desiredRetention)
		const lastEnd = segs.at(-1)?.endDay ?? 1
		// A little headroom so the final reset isn't flush against the edge.
		return { segments: segs, dayMax: Math.ceil(lastEnd * 1.08) }
	}, [scores, desiredRetention])

	// Coordinate mappers
	const toX = (day: number) => PAD.left + (day / dayMax) * PLOT.w
	const toY = (r: number) => PAD.top + (1 - (r - yMin) / (1 - yMin)) * PLOT.h

	// Y gridlines / ticks: every 10% from yMin to 100%.
	const yTicks: Array<number> = []
	for (let r = Math.ceil(yMin * 10) / 10; r <= 1.0001; r += 0.1) {
		yTicks.push(Math.round(r * 100) / 100)
	}

	// When early reviews cluster (e.g. after a lapse), their top labels would
	// overlap. Draw a grade label only when there's horizontal room since the
	// last one; the colored arrow + glyph still mark every review.
	const MIN_LABEL_GAP = 48
	const labeledIndices = new Set<number>()
	let lastLabelX = -Infinity
	for (const s of segments) {
		const x = toX(s.startDay)
		if (x - lastLabelX >= MIN_LABEL_GAP) {
			labeledIndices.add(s.index)
			lastLabelX = x
		}
	}

	return (
		<svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="h-auto w-full">
			<title>FSRS forgetting curve for a sequence of reviews</title>

			{/* Y gridlines + labels */}
			{yTicks.map((r) => (
				<g key={`y-${r}`}>
					<line
						x1={PAD.left}
						x2={PAD.left + PLOT.w}
						y1={toY(r)}
						y2={toY(r)}
						className="text-2-lo-neutral"
						stroke="currentColor"
						strokeWidth={1}
					/>
					<text
						x={PAD.left - 12}
						y={toY(r) + 4}
						textAnchor="end"
						className="fill-muted-foreground text-[13px]"
					>
						{Math.round(r * 100)}%
					</text>
				</g>
			))}

			{/* X axis ticks at each review day */}
			{segments.map((s) => (
				<g key={`x-${s.index}`}>
					<line
						x1={toX(s.endDay)}
						x2={toX(s.endDay)}
						y1={PAD.top}
						y2={PAD.top + PLOT.h}
						className="text-1-lo-neutral"
						stroke="currentColor"
						strokeWidth={1}
					/>
					<text
						x={toX(s.endDay)}
						y={PAD.top + PLOT.h + 22}
						textAnchor="middle"
						className="fill-muted-foreground text-[12px]"
					>
						{s.endDay.toFixed(1)}
					</text>
				</g>
			))}

			{/* Faint "if you never reviewed" decay tails from each review point */}
			{segments.map((s) => {
				const pts: Array<[number, number]> = []
				for (let k = 0; k <= SAMPLES_PER_SEGMENT * 3; k++) {
					const day = s.startDay + (k / SAMPLES_PER_SEGMENT) * s.stability * 4
					if (day > dayMax) break
					const r = retrievability(day - s.startDay, s.stability)
					if (r < yMin) {
						pts.push([toX(day), toY(yMin)])
						break
					}
					pts.push([toX(day), toY(r)])
				}
				return (
					<path
						key={`tail-${s.index}`}
						d={buildPath(pts)}
						fill="none"
						className="text-3-mlo-accent"
						stroke="currentColor"
						strokeWidth={1.5}
					/>
				)
			})}

			{/* Main retention curves: 100% decaying to desiredRetention, per review */}
			{segments.map((s) => {
				const pts: Array<[number, number]> = []
				for (let k = 0; k <= SAMPLES_PER_SEGMENT; k++) {
					const t = (k / SAMPLES_PER_SEGMENT) * (s.endDay - s.startDay)
					const r = retrievability(t, s.stability)
					pts.push([toX(s.startDay + t), toY(r)])
				}
				return (
					<path
						key={`curve-${s.index}`}
						d={buildPath(pts)}
						fill="none"
						className="text-accent"
						stroke="currentColor"
						strokeWidth={4}
						strokeLinecap="round"
					/>
				)
			})}

			{/* Dashed vertical "review" reset lines, colored by the grade given */}
			{segments.slice(1).map((s) => (
				<line
					key={`reset-${s.index}`}
					x1={toX(s.startDay)}
					x2={toX(s.startDay)}
					y1={toY(desiredRetention)}
					y2={toY(1)}
					className={SCORE_META[s.score].text}
					stroke="currentColor"
					strokeWidth={2.5}
					strokeDasharray="5 5"
				/>
			))}

			{/* Review markers + arrows + grade label along the top */}
			{segments.map((s) => {
				const x = toX(s.startDay)
				const meta = SCORE_META[s.score]
				return (
					<g key={`marker-${s.index}`} className={meta.text}>
						<line
							x1={x}
							x2={x}
							y1={PAD.top - 26}
							y2={PAD.top - 6}
							stroke="currentColor"
							strokeWidth={2}
						/>
						<path
							d={`M${x - 4},${PAD.top - 11} L${x},${PAD.top - 4} L${x + 4},${PAD.top - 11} Z`}
							fill="currentColor"
						/>
						{labeledIndices.has(s.index) && (
							<text
								x={x}
								y={PAD.top - 32}
								textAnchor="middle"
								className="text-[12px] font-medium"
								fill="currentColor"
							>
								{s.index === 0 ? `Learn` : meta.label}
							</text>
						)}
						<ScoreGlyph score={s.score} x={x} y={toY(1)} />
					</g>
				)
			})}

			{/* Axes */}
			<line
				x1={PAD.left}
				x2={PAD.left}
				y1={PAD.top - 4}
				y2={PAD.top + PLOT.h}
				className="text-foreground"
				stroke="currentColor"
				strokeWidth={2.5}
			/>
			<line
				x1={PAD.left}
				x2={PAD.left + PLOT.w}
				y1={PAD.top + PLOT.h}
				y2={PAD.top + PLOT.h}
				className="text-foreground"
				stroke="currentColor"
				strokeWidth={2.5}
			/>

			{/* Axis titles */}
			<text
				x={PAD.left + PLOT.w / 2}
				y={VB.h - 12}
				textAnchor="middle"
				className="fill-foreground text-[15px] font-semibold"
			>
				Days
			</text>
			<text
				x={-(PAD.top + PLOT.h / 2)}
				y={22}
				textAnchor="middle"
				transform="rotate(-90)"
				className="fill-foreground text-[15px] font-semibold"
			>
				Retention
			</text>
		</svg>
	)
}

function ChartLegend() {
	return (
		<div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
			{([1, 2, 3, 4] as Array<Score>).map((s) => (
				<span key={s} className={SCORE_META[s].text}>
					{SCORE_META[s].glyph} {SCORE_META[s].label}
				</span>
			))}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function RangeControl({
	id,
	label,
	value,
	min,
	max,
	step,
	display,
	onChange,
}: {
	id: string
	label: string
	value: number
	min: number
	max: number
	step: number
	display: string
	onChange: (v: number) => void
}) {
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between">
				<Label htmlFor={id}>{label}</Label>
				<span className="text-muted-foreground text-sm tabular-nums">
					{display}
				</span>
			</div>
			<input
				id={id}
				type="range"
				aria-label={label}
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="accent-accent w-full"
			/>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Reviews carry a stable id so the editor rows have data-dependent keys
// (positional index keys would re-key on add/remove).
interface Review {
	id: number
	score: Score
}
let reviewIdCounter = 0
const makeReview = (score: Score): Review => ({ id: reviewIdCounter++, score })
const makeReviews = (scores: ReadonlyArray<Score>) => scores.map(makeReview)

function FsrsPage() {
	const [reviews, setReviews] = useState<Array<Review>>(() =>
		makeReviews(DEFAULTS.scores)
	)
	const [desiredRetention, setDesiredRetention] = useState<number>(
		DEFAULTS.desiredRetention
	)
	const [yMin, setYMin] = useState<number>(DEFAULTS.yMin)

	const scores = useMemo(() => reviews.map((r) => r.score), [reviews])
	const segments = useMemo(
		() => simulateReviews(scores, desiredRetention),
		[scores, desiredRetention]
	)

	const setScoreAt = (id: number, value: Score) =>
		setReviews((prev) =>
			prev.map((r) => (r.id === id ? { ...r, score: value } : r))
		)
	const addReview = () =>
		setReviews((prev) => (prev.length >= 8 ? prev : [...prev, makeReview(3)]))
	const removeReview = (id: number) =>
		setReviews((prev) =>
			prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)
		)

	return (
		<main className="@container mx-auto max-w-5xl space-y-6 p-4 pb-20">
			<div className="space-y-1">
				<h1 className="text-3xl font-bold">How FSRS Works</h1>
				<p className="text-muted-foreground text-sm">
					The forgetting curve for a whole sequence of reviews, drawn from the
					real FSRS v5 functions in{' '}
					<code className="text-xs">src/features/review/fsrs.ts</code>. Each
					time recall decays to your target retention the card comes back around
					— and how you grade it reshapes what comes next. A lapse{' '}
					<span className="text-red-600">(Again ✕)</span> still resets recall
					when you re-study, but stability collapses, so the next curve is short
					and steep.
				</p>
			</div>

			<Card>
				<CardContent className="pt-6">
					<ForgettingCurveChart
						scores={scores}
						desiredRetention={desiredRetention}
						yMin={yMin}
					/>
					<ChartLegend />
				</CardContent>
			</Card>

			<div className="grid gap-6 @lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Tweak it</CardTitle>
						<CardDescription>
							Pick a preset or grade each review yourself. Defaults live in the{' '}
							<code className="text-xs">DEFAULTS</code> object at the top of the
							route file.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="space-y-2">
							<Label>Presets</Label>
							<div className="flex flex-wrap gap-2">
								{PRESETS.map((p) => (
									<Button
										key={p.label}
										variant="soft"
										size="sm"
										onClick={() => setReviews(makeReviews(p.scores))}
									>
										{p.label}
									</Button>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Review sequence</Label>
								<span className="text-muted-foreground text-xs">
									grade each review
								</span>
							</div>
							<div className="space-y-1.5">
								{reviews.map((r, i) => (
									<div key={r.id} className="flex items-center gap-2">
										<span className="text-muted-foreground w-16 shrink-0 text-xs">
											{i === 0 ? 'Learn' : `Review ${i}`}
										</span>
										<div className="flex flex-1 gap-1">
											{([1, 2, 3, 4] as Array<Score>).map((opt) => (
												<button
													key={opt}
													type="button"
													onClick={() => setScoreAt(r.id, opt)}
													className={cn(
														'flex-1 rounded-2xl border px-1 py-1 text-xs transition-colors',
														r.score === opt
															? `${SCORE_META[opt].activeBtn} font-medium`
															: 'border-border text-muted-foreground hover:bg-1-lo-neutral'
													)}
												>
													{SCORE_META[opt].label}
												</button>
											))}
										</div>
										<button
											type="button"
											onClick={() => removeReview(r.id)}
											aria-label={`Remove review ${i}`}
											disabled={reviews.length <= 1}
											className="text-muted-foreground hover:text-5-hi-danger disabled:opacity-40"
										>
											<X className="size-4" />
										</button>
									</div>
								))}
							</div>
							<Button
								variant="soft"
								size="sm"
								onClick={addReview}
								disabled={reviews.length >= 8}
							>
								Add review
							</Button>
						</div>

						<RangeControl
							id="retention"
							label="Target retention (review trigger)"
							value={desiredRetention}
							min={0.75}
							max={0.97}
							step={0.01}
							display={`${Math.round(desiredRetention * 100)}%`}
							onChange={setDesiredRetention}
						/>

						<RangeControl
							id="y-min"
							label="Y-axis floor"
							value={yMin}
							min={0.5}
							max={Math.min(0.85, desiredRetention - 0.05)}
							step={0.05}
							display={`${Math.round(yMin * 100)}%`}
							onChange={(v) => setYMin(Math.round(v * 20) / 20)}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Schedule</CardTitle>
						<CardDescription>
							Stability is the interval (in days) at which recall hits the
							target retention. Watch it grow on success and collapse on a
							lapse.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<table className="w-full text-sm">
							<thead>
								<tr className="text-muted-foreground border-b text-left text-xs">
									<th className="py-1.5">#</th>
									<th className="py-1.5">Grade</th>
									<th className="py-1.5">Day</th>
									<th className="py-1.5">Interval</th>
									<th className="py-1.5">Stability</th>
									<th className="py-1.5">Diff.</th>
								</tr>
							</thead>
							<tbody>
								{segments.map((s) => (
									<tr key={s.index} className="border-b last:border-0">
										<td className="py-1.5 font-medium">
											{s.index === 0 ? 'Learn' : s.index}
										</td>
										<td
											className={cn(
												'py-1.5 font-medium',
												SCORE_META[s.score].text
											)}
										>
											{SCORE_META[s.score].label}
										</td>
										<td className="py-1.5 tabular-nums">
											{s.startDay.toFixed(1)}
										</td>
										<td className="py-1.5 tabular-nums">
											{(s.endDay - s.startDay).toFixed(1)}d
										</td>
										<td className="py-1.5 tabular-nums">
											{s.stability.toFixed(2)}
										</td>
										<td className="py-1.5 tabular-nums">
											{s.difficulty.toFixed(2)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			</div>
		</main>
	)
}
