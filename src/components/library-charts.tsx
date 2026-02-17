import { useMemo, useState, useCallback, type MouseEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLiveQuery, eq } from '@tanstack/react-db'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ScatterChart,
	Scatter,
	Treemap,
	XAxis,
	YAxis,
	ZAxis,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
} from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import {
	languagesCollection,
	phrasesCollection,
	langTagsCollection,
	phraseRequestsCollection,
	phrasePlaylistsCollection,
} from '@/lib/collections'
import languages from '@/lib/languages'

// ─── Chart 1: Language Comparison ────────────────────────────────

const langChartConfig = {
	phrases: {
		label: 'Phrases',
		color: 'var(--chart-1)',
	},
	learners: {
		label: 'Learners',
		color: 'var(--chart-2)',
	},
} satisfies ChartConfig

export function LanguageComparisonChart() {
	const { data: allLanguages } = useLiveQuery((q) =>
		q
			.from({ lang: languagesCollection })
			.orderBy(({ lang }) => lang.learners, 'desc')
	)

	const chartData = useMemo(() => {
		if (!allLanguages?.length) return []
		return allLanguages
			.filter((l) => (l.phrases_to_learn ?? 0) > 0)
			.slice(0, 12)
			.map((l) => ({
				name: l.name,
				lang: l.lang,
				phrases: l.phrases_to_learn ?? 0,
				learners: l.learners ?? 0,
			}))
	}, [allLanguages])

	if (!chartData.length) return null

	return (
		<ChartContainer config={langChartConfig} className="h-[400px] w-full">
			<BarChart
				accessibilityLayer
				data={chartData}
				layout="vertical"
				margin={{ left: 10, right: 30 }}
			>
				<CartesianGrid horizontal={false} />
				<XAxis
					type="number"
					tickLine={false}
					axisLine={false}
					stroke="hsl(var(--muted-foreground))"
				/>
				<YAxis
					type="category"
					dataKey="name"
					tickLine={false}
					axisLine={false}
					width={80}
					stroke="hsl(var(--muted-foreground))"
					tick={{ fontSize: 12 }}
				/>
				<ChartTooltip
					cursor={false}
					// oxlint-disable-next-line jsx-no-jsx-as-prop
					content={<ChartTooltipContent indicator="dot" />}
				/>
				<Bar
					dataKey="phrases"
					fill="var(--color-phrases)"
					radius={[0, 4, 4, 0]}
				/>
				<Bar
					dataKey="learners"
					fill="var(--color-learners)"
					radius={[0, 4, 4, 0]}
				/>
			</BarChart>
		</ChartContainer>
	)
}

// ─── Chart 2: Difficulty vs Popularity Scatter ──────────────────

const SCATTER_COLORS = [
	'oklch(0.6 0.2 295)',
	'oklch(0.6 0.15 185)',
	'oklch(0.65 0.18 55)',
	'oklch(0.55 0.2 310)',
	'oklch(0.6 0.18 130)',
]

export function DifficultyPopularityScatter({ lang }: { lang: string }) {
	const { data: allPhrases } = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

	const scatterData = useMemo(() => {
		if (!allPhrases?.length) return []
		return allPhrases
			.filter((p) => p.avg_difficulty !== null && (p.count_learners ?? 0) > 0)
			.map((p) => ({
				difficulty: Math.round((p.avg_difficulty ?? 0) * 100) / 100,
				learners: p.count_learners ?? 0,
				stability: Math.min(p.avg_stability ?? 1, 365),
				text: p.text.slice(0, 40),
			}))
	}, [allPhrases])

	if (!scatterData.length) {
		return (
			<p className="text-muted-foreground py-12 text-center">
				No difficulty data available for {languages[lang] ?? lang} yet. Phrases
				need reviews to generate difficulty scores.
			</p>
		)
	}

	return (
		<ResponsiveContainer width="100%" height={400}>
			<ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis
					type="number"
					dataKey="difficulty"
					name="Difficulty"
					domain={[0, 10]}
					tickLine={false}
					stroke="hsl(var(--muted-foreground))"
					label={{
						value: 'Difficulty',
						position: 'insideBottom',
						offset: -10,
						style: { fill: 'hsl(var(--muted-foreground))' },
					}}
				/>
				<YAxis
					type="number"
					dataKey="learners"
					name="Learners"
					tickLine={false}
					stroke="hsl(var(--muted-foreground))"
					label={{
						value: 'Learners',
						angle: -90,
						position: 'insideLeft',
						style: { fill: 'hsl(var(--muted-foreground))' },
					}}
				/>
				<ZAxis
					type="number"
					dataKey="stability"
					range={[40, 400]}
					name="Stability"
				/>
				<RechartsTooltip
					content={({ payload }) => {
						if (!payload?.length) return null
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						const d = payload[0]?.payload as (typeof scatterData)[0]
						if (!d) return null
						return (
							<div className="bg-background rounded border p-2 text-xs shadow-lg">
								<p className="mb-1 font-medium">{d.text}</p>
								<p>
									Difficulty: <span className="font-mono">{d.difficulty}</span>
								</p>
								<p>
									Learners: <span className="font-mono">{d.learners}</span>
								</p>
								<p>
									Stability: <span className="font-mono">{d.stability}d</span>
								</p>
							</div>
						)
					}}
				/>
				<Scatter data={scatterData} fillOpacity={0.6}>
					{scatterData.map((entry, i) => (
						<Cell
							key={`${entry.difficulty}-${entry.learners}-${entry.text}`}
							fill={SCATTER_COLORS[i % SCATTER_COLORS.length]}
						/>
					))}
				</Scatter>
			</ScatterChart>
		</ResponsiveContainer>
	)
}

// ─── Chart 3: Tag Treemap ───────────────────────────────────────

const TREEMAP_COLORS = [
	'oklch(0.55 0.2 295)',
	'oklch(0.58 0.15 185)',
	'oklch(0.52 0.18 55)',
	'oklch(0.50 0.2 310)',
	'oklch(0.55 0.18 130)',
	'oklch(0.48 0.15 25)',
	'oklch(0.60 0.12 240)',
	'oklch(0.53 0.2 345)',
]

interface TreemapItem {
	name: string
	size: number
	fill: string
}

interface TreemapContentProps extends TreemapItem {
	x: number
	y: number
	width: number
	height: number
	totalPhrases: number
	onHover: (item: TreemapItem | null, e: MouseEvent<SVGElement>) => void
	onClick: (tagName: string) => void
}

function TreemapContent({
	x,
	y,
	width,
	height,
	name,
	size,
	fill,
	totalPhrases,
	onHover,
	onClick,
}: TreemapContentProps) {
	const pct = totalPhrases > 0 ? ((size / totalPhrases) * 100).toFixed(1) : '0'
	return (
		<g
			className="cursor-pointer"
			onMouseEnter={(e) => onHover({ name, size, fill }, e)}
			onMouseMove={(e) => onHover({ name, size, fill }, e)}
			onMouseLeave={(e) => onHover(null, e)}
			onClick={() => onClick(name)}
		>
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				fill={fill}
				stroke="var(--background)"
				strokeWidth={2}
				rx={3}
			/>
			{/* Hover highlight overlay */}
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				fill="white"
				opacity={0}
				rx={3}
				className="transition-opacity hover:opacity-15"
			/>
			{width > 40 && height > 24 && (
				<text
					x={x + width / 2}
					y={y + height / 2 - (height > 44 ? 8 : 0)}
					textAnchor="middle"
					dominantBaseline="central"
					className="pointer-events-none text-xs font-medium"
					fill="white"
					style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
				>
					{width > 60 ? name : name.slice(0, 6)}
				</text>
			)}
			{height > 44 && width > 50 && (
				<text
					x={x + width / 2}
					y={y + height / 2 + 10}
					textAnchor="middle"
					dominantBaseline="central"
					className="pointer-events-none text-[10px]"
					fill="rgba(255,255,255,0.7)"
					style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
				>
					{size} phrases ({pct}%)
				</text>
			)}
		</g>
	)
}

export function TagTreemap({ lang }: { lang: string }) {
	const navigate = useNavigate()
	const [tooltip, setTooltip] = useState<{
		item: TreemapItem
		x: number
		y: number
	} | null>(null)

	const { data: allPhrases } = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

	const { treemapData, totalTagged } = useMemo(() => {
		if (!allPhrases?.length) return { treemapData: [], totalTagged: 0 }
		const tagCounts = new Map<string, number>()
		let tagged = 0
		for (const phrase of allPhrases) {
			if (phrase.tags?.length) tagged++
			for (const tag of phrase.tags ?? []) {
				tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1)
			}
		}
		const data = Array.from(tagCounts.entries())
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 30)
			.map(([name, size], i) => ({
				name,
				size,
				fill: TREEMAP_COLORS[i % TREEMAP_COLORS.length],
			}))
		return { treemapData: data, totalTagged: tagged }
	}, [allPhrases])

	const handleHover = useCallback(
		(item: TreemapItem | null, e: MouseEvent<SVGElement>) => {
			if (!item) {
				setTooltip(null)
				return
			}
			setTooltip({ item, x: e.clientX, y: e.clientY })
		},
		[]
	)

	const handleClick = useCallback(
		(tagName: string) => {
			void navigate({
				to: '/learn/browse',
				search: { tags: tagName, langs: lang },
			})
		},
		[navigate, lang]
	)

	if (!treemapData.length) {
		return (
			<p className="text-muted-foreground py-12 text-center">
				No tags available for {languages[lang] ?? lang} yet.
			</p>
		)
	}

	return (
		<div className="relative">
			<ResponsiveContainer width="100%" height={350}>
				<Treemap
					data={treemapData}
					dataKey="size"
					aspectRatio={4 / 3}
					stroke="var(--background)"
					// oxlint-disable-next-line jsx-no-jsx-as-prop
					content={
						<TreemapContent
							name=""
							size={0}
							fill=""
							x={0}
							y={0}
							width={0}
							height={0}
							totalPhrases={totalTagged}
							onHover={handleHover}
							onClick={handleClick}
						/>
					}
				/>
			</ResponsiveContainer>
			{tooltip && (
				<div
					className="bg-background pointer-events-none fixed z-50 rounded-lg border px-3 py-2 text-sm shadow-xl"
					style={{
						left: tooltip.x + 12,
						top: tooltip.y - 10,
					}}
				>
					<p className="font-semibold">{tooltip.item.name}</p>
					<p className="text-muted-foreground">
						{tooltip.item.size} phrases (
						{totalTagged > 0 ?
							((tooltip.item.size / totalTagged) * 100).toFixed(1)
						:	0}
						%)
					</p>
					<p className="text-primary mt-1 text-xs">Click to browse phrases</p>
				</div>
			)}
		</div>
	)
}

// ─── Chart 4: Difficulty Distribution Histogram ─────────────────

const histogramConfig = {
	count: {
		label: 'Phrases',
		color: 'var(--chart-1)',
	},
} satisfies ChartConfig

const DIFFICULTY_BUCKETS = [
	{ label: '0-1', min: 0, max: 1 },
	{ label: '1-2', min: 1, max: 2 },
	{ label: '2-3', min: 2, max: 3 },
	{ label: '3-4', min: 3, max: 4 },
	{ label: '4-5', min: 4, max: 5 },
	{ label: '5-6', min: 5, max: 6 },
	{ label: '6-7', min: 6, max: 7 },
	{ label: '7-8', min: 7, max: 8 },
	{ label: '8-9', min: 8, max: 9 },
	{ label: '9-10', min: 9, max: 10 },
]

const HISTOGRAM_FILLS = [
	'oklch(0.65 0.18 150)',
	'oklch(0.62 0.18 160)',
	'oklch(0.59 0.18 180)',
	'oklch(0.56 0.19 210)',
	'oklch(0.53 0.2 240)',
	'oklch(0.50 0.21 260)',
	'oklch(0.48 0.22 280)',
	'oklch(0.46 0.22 295)',
	'oklch(0.44 0.2 310)',
	'oklch(0.42 0.18 330)',
]

export function DifficultyHistogram({ lang }: { lang: string }) {
	const { data: allPhrases } = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

	const histogramData = useMemo(() => {
		if (!allPhrases?.length) return []
		const withDifficulty = allPhrases.filter((p) => p.avg_difficulty !== null)
		if (!withDifficulty.length) return []

		return DIFFICULTY_BUCKETS.map((bucket, i) => {
			const count = withDifficulty.filter(
				(p) =>
					(p.avg_difficulty ?? 0) >= bucket.min &&
					(p.avg_difficulty ?? 0) < (bucket.max === 10 ? 10.1 : bucket.max)
			).length
			return {
				range: bucket.label,
				count,
				fill: HISTOGRAM_FILLS[i],
			}
		})
	}, [allPhrases])

	if (!histogramData.length || histogramData.every((d) => d.count === 0)) {
		return (
			<p className="text-muted-foreground py-12 text-center">
				No difficulty data available for {languages[lang] ?? lang} yet. Phrases
				need reviews to generate difficulty scores.
			</p>
		)
	}

	return (
		<ChartContainer config={histogramConfig} className="h-[300px] w-full">
			<BarChart accessibilityLayer data={histogramData} margin={{ bottom: 20 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="range"
					tickLine={false}
					axisLine={false}
					stroke="hsl(var(--muted-foreground))"
					label={{
						value: 'Difficulty Score',
						position: 'insideBottom',
						offset: -10,
						style: { fill: 'hsl(var(--muted-foreground))' },
					}}
				/>
				<YAxis
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					stroke="hsl(var(--muted-foreground))"
					width={40}
				/>
				<ChartTooltip
					cursor={false}
					// oxlint-disable-next-line jsx-no-jsx-as-prop
					content={<ChartTooltipContent hideLabel />}
				/>
				<Bar dataKey="count" radius={[4, 4, 0, 0]}>
					{histogramData.map((entry) => (
						<Cell key={entry.range} fill={entry.fill} />
					))}
				</Bar>
			</BarChart>
		</ChartContainer>
	)
}

// ─── Language Selector ──────────────────────────────────────────

export function useLanguageSelector() {
	const { data: allLanguages } = useLiveQuery((q) =>
		q
			.from({ lang: languagesCollection })
			.orderBy(({ lang }) => lang.phrases_to_learn, 'desc')
	)

	const availableLanguages = useMemo(
		() => (allLanguages ?? []).filter((l) => (l.phrases_to_learn ?? 0) > 0),
		[allLanguages]
	)

	const [selectedLang, setSelectedLang] = useState<string>('')

	// Default to most popular language
	const activeLang = selectedLang || availableLanguages[0]?.lang || ''

	return { availableLanguages, activeLang, setSelectedLang }
}

// ─── Library Summary Stats ──────────────────────────────────────

export function LibrarySummaryStats() {
	const { data: allLanguages } = useLiveQuery((q) =>
		q.from({ lang: languagesCollection })
	)
	const { data: allPhrases } = useLiveQuery((q) =>
		q.from({ phrase: phrasesCollection })
	)
	const { data: allRequests } = useLiveQuery((q) =>
		q.from({ req: phraseRequestsCollection })
	)
	const { data: allPlaylists } = useLiveQuery((q) =>
		q
			.from({ playlist: phrasePlaylistsCollection })
			.where(({ playlist }) => eq(playlist.deleted, false))
	)
	const { data: allTags } = useLiveQuery((q) =>
		q.from({ tag: langTagsCollection })
	)

	const phrasesWithDifficulty = useMemo(
		() => allPhrases?.filter((p) => p.avg_difficulty !== null).length ?? 0,
		[allPhrases]
	)

	const totalTranslations = useMemo(
		() =>
			allPhrases?.reduce((sum, p) => sum + (p.translations?.length ?? 0), 0) ??
			0,
		[allPhrases]
	)

	const stats = [
		{ label: 'Languages', value: allLanguages?.length ?? 0 },
		{ label: 'Phrases', value: allPhrases?.length ?? 0 },
		{ label: 'Translations', value: totalTranslations },
		{ label: 'Tags', value: allTags?.length ?? 0 },
		{ label: 'Playlists', value: allPlaylists?.length ?? 0 },
		{ label: 'Requests', value: allRequests?.length ?? 0 },
		{ label: 'With Difficulty Data', value: phrasesWithDifficulty },
	]

	return (
		<div className="grid grid-cols-2 gap-3 @md:grid-cols-4 @xl:grid-cols-7">
			{stats.map((stat) => (
				<div
					key={stat.label}
					className="bg-card rounded border p-3 text-center"
				>
					<p className="text-primary text-2xl font-bold tabular-nums">
						{stat.value.toLocaleString()}
					</p>
					<p className="text-muted-foreground text-xs">{stat.label}</p>
				</div>
			))}
		</div>
	)
}
