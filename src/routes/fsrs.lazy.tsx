import { createLazyFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
	calculateFSRS,
	calculateInterval,
	retrievability,
	type Score,
} from '@/features/review/fsrs'
import { type CardReviewType } from '@/features/review/schemas'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
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
	/** Self-assessment used for every simulated review: 1=Again 2=Hard 3=Good 4=Easy */
	score: 3 as Score,
	/** Retention the scheduler aims for. The card "comes back around" the moment
	 *  its recall probability decays to this value — 0.9 = 90%. */
	desiredRetention: 0.9,
	/** How many times we review the card in the simulation. */
	numReviews: 5,
	/** Bottom of the Y axis. 0.7 = the chart starts at 70% retention. */
	yMin: 0.7,
} as const

// SVG geometry (in viewBox units)
const VB = { w: 820, h: 520 }
const PAD = { top: 56, right: 48, bottom: 64, left: 76 }
const PLOT = {
	w: VB.w - PAD.left - PAD.right,
	h: VB.h - PAD.top - PAD.bottom,
}
const SAMPLES_PER_SEGMENT = 80

const SCORE_LABELS: Record<Score, string> = {
	1: 'Again',
	2: 'Hard',
	3: 'Good',
	4: 'Easy',
}

// ---------------------------------------------------------------------------
// Simulation — drive the real FSRS functions through a sequence of reviews.
// Each review fires exactly when retrievability decays to `desiredRetention`,
// resetting recall to 100% and lengthening the next interval (rising stability).
// ---------------------------------------------------------------------------

interface Segment {
	index: number
	/** Day this review happened (curve = 100% here). */
	startDay: number
	/** Day the next review is scheduled (curve = desiredRetention here). */
	endDay: number
	stability: number
	difficulty: number
}

function simulateReviews(
	score: Score,
	desiredRetention: number,
	numReviews: number
): Array<Segment> {
	const BASE = new Date('2025-01-01T00:00:00Z')
	const atDay = (d: number) => new Date(BASE.getTime() + d * 86_400_000)

	const segments: Array<Segment> = []
	let previousReview: CardReviewType | undefined = undefined
	let day = 0

	for (let i = 0; i < numReviews; i++) {
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
			startDay: day,
			endDay: day + interval,
			stability,
			difficulty,
		})

		// Minimal review record to feed the next iteration's calculateFSRS.
		previousReview = {
			id: crypto.randomUUID(),
			created_at: atDay(day).toISOString(),
			uid: '00000000-0000-0000-0000-000000000000',
			day_session: atDay(day).toISOString().slice(0, 10),
			lang: 'eng',
			phrase_id: '00000000-0000-0000-0000-000000000000',
			direction: 'forward',
			score,
			day_first_review: i === 0,
			difficulty,
			review_time_retrievability: i === 0 ? null : desiredRetention,
			stability,
			updated_at: null,
		}

		day += interval
	}

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

function ForgettingCurveChart({
	score,
	desiredRetention,
	numReviews,
	yMin,
}: {
	score: Score
	desiredRetention: number
	numReviews: number
	yMin: number
}) {
	const { segments, dayMax } = useMemo(() => {
		const segs = simulateReviews(score, desiredRetention, numReviews)
		const lastEnd = segs.at(-1)?.endDay ?? 1
		// A little headroom so the final reset isn't flush against the edge.
		return { segments: segs, dayMax: Math.ceil(lastEnd * 1.08) }
	}, [score, desiredRetention, numReviews])

	// Coordinate mappers
	const toX = (day: number) => PAD.left + (day / dayMax) * PLOT.w
	const toY = (r: number) => PAD.top + (1 - (r - yMin) / (1 - yMin)) * PLOT.h

	// Y gridlines / ticks: every 10% from yMin to 100%.
	const yTicks: Array<number> = []
	for (let r = Math.ceil(yMin * 10) / 10; r <= 1.0001; r += 0.1) {
		yTicks.push(Math.round(r * 100) / 100)
	}

	return (
		<svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="h-auto w-full">
			<title>FSRS forgetting curve with reviews</title>
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
						className="fill-muted-foreground text-[13px]"
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

			{/* Dashed vertical "review" reset lines: target retention back up to 100% */}
			{segments.slice(0, -1).map((s) => (
				<line
					key={`reset-${s.index}`}
					x1={toX(s.endDay)}
					x2={toX(s.endDay)}
					y1={toY(desiredRetention)}
					y2={toY(1)}
					className="text-accent"
					stroke="currentColor"
					strokeWidth={2.5}
					strokeDasharray="5 5"
				/>
			))}

			{/* Review markers + arrows along the top */}
			{segments.map((s) => {
				const x = toX(s.startDay)
				return (
					<g key={`marker-${s.index}`}>
						<line
							x1={x}
							x2={x}
							y1={PAD.top - 26}
							y2={PAD.top - 4}
							className="text-accent"
							stroke="currentColor"
							strokeWidth={2}
						/>
						<path
							d={`M${x - 4},${PAD.top - 9} L${x},${PAD.top - 2} L${x + 4},${PAD.top - 9} Z`}
							className="fill-accent"
						/>
						<text
							x={x}
							y={PAD.top - 32}
							textAnchor="middle"
							className="fill-accent-foreground text-[12px] font-medium"
						>
							{s.index === 0 ? 'Learned' : `Review ${s.index}`}
						</text>
						{/* dot where this curve starts at 100% */}
						<circle cx={x} cy={toY(1)} r={4} className="fill-accent" />
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

function FsrsPage() {
	const [score, setScore] = useState<Score>(DEFAULTS.score)
	const [desiredRetention, setDesiredRetention] = useState<number>(
		DEFAULTS.desiredRetention
	)
	const [numReviews, setNumReviews] = useState<number>(DEFAULTS.numReviews)
	const [yMin, setYMin] = useState<number>(DEFAULTS.yMin)

	const segments = useMemo(
		() => simulateReviews(score, desiredRetention, numReviews),
		[score, desiredRetention, numReviews]
	)

	return (
		<main className="@container mx-auto max-w-5xl space-y-6 p-4 pb-20">
			<div className="space-y-1">
				<h1 className="text-3xl font-bold">How FSRS Works</h1>
				<p className="text-muted-foreground text-sm">
					The forgetting curve, drawn from the real FSRS v5 functions in{' '}
					<code className="text-xs">src/features/review/fsrs.ts</code>. Each
					time recall decays to your target retention the card comes back
					around; a correct answer resets recall to 100% and stretches the next
					interval.
				</p>
			</div>

			<Card>
				<CardContent className="pt-6">
					<ForgettingCurveChart
						score={score}
						desiredRetention={desiredRetention}
						numReviews={numReviews}
						yMin={yMin}
					/>
				</CardContent>
			</Card>

			<div className="grid gap-6 @lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Tweak it</CardTitle>
						<CardDescription>
							Adjust the simulation. Defaults live in the{' '}
							<code className="text-xs">DEFAULTS</code> object at the top of the
							route file.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="space-y-1">
							<Label>Review score</Label>
							<div className="flex gap-2">
								{([1, 2, 3, 4] as Array<Score>).map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => setScore(s)}
										className={
											'flex-1 rounded-2xl border px-2 py-1.5 text-sm transition-colors ' +
											(score === s
												? 'border-accent bg-2-mlo-accent text-accent-foreground font-medium'
												: 'border-border text-muted-foreground hover:bg-1-lo-accent')
										}
									>
										{SCORE_LABELS[s]}
									</button>
								))}
							</div>
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
							id="num-reviews"
							label="Number of reviews"
							value={numReviews}
							min={2}
							max={8}
							step={1}
							display={String(numReviews)}
							onChange={(v) => setNumReviews(Math.round(v))}
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
							target retention. Notice it grows with every successful review.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<table className="w-full text-sm">
							<thead>
								<tr className="text-muted-foreground border-b text-left text-xs">
									<th className="py-1.5">#</th>
									<th className="py-1.5">Day</th>
									<th className="py-1.5">Interval</th>
									<th className="py-1.5">Stability</th>
									<th className="py-1.5">Difficulty</th>
								</tr>
							</thead>
							<tbody>
								{segments.map((s) => (
									<tr key={s.index} className="border-b last:border-0">
										<td className="py-1.5 font-medium">
											{s.index === 0 ? 'Learn' : s.index}
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
