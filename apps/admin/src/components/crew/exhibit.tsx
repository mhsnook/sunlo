import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from 'recharts'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import type { ChartType, ExhibitType } from '../../../shared/crew'

const colors = [
	'var(--chart-1)',
	'var(--color-teal-600)',
	'var(--color-amber-600)',
	'var(--color-neutral-500)',
	'var(--color-rose-600)',
	'var(--color-sky-600)',
]

export function Exhibit({ exhibit }: { exhibit: ExhibitType }) {
	return (
		<figure
			className="bg-card w-full max-w-2xl space-y-2 rounded border p-3"
			data-testid="crew-exhibit"
			data-key={exhibit.kind}
		>
			<figcaption className="text-sm font-semibold">{exhibit.title}</figcaption>
			{exhibit.kind === 'chart' ? (
				<ExhibitChart chart={exhibit.chart} />
			) : (
				// No allow-same-origin: the explorer runs scripts but cannot reach
				// the admin's session, cookies or API.
				<iframe
					title={exhibit.title}
					sandbox="allow-scripts"
					srcDoc={exhibit.html}
					className="h-96 w-full resize-y rounded border bg-white"
				/>
			)}
		</figure>
	)
}

function ExhibitChart({ chart }: { chart: ChartType }) {
	const config: ChartConfig = Object.fromEntries(
		chart.series.map((series, index) => [
			series.key,
			{ label: series.label, color: colors[index % colors.length] },
		])
	)
	const parts = (
		<>
			<CartesianGrid vertical={false} />
			<XAxis
				dataKey={chart.x}
				tickLine={false}
				axisLine={false}
				minTickGap={16}
			/>
			<YAxis tickLine={false} axisLine={false} width={36} />
			<ChartTooltip content={<ChartTooltipContent />} />
			{chart.series.length > 1 && (
				<ChartLegend content={<ChartLegendContent />} />
			)}
		</>
	)
	return (
		<ChartContainer config={config} className="h-64 w-full">
			{chart.type === 'line' ? (
				<LineChart accessibilityLayer data={chart.rows}>
					{parts}
					{chart.series.map((series) => (
						<Line
							key={series.key}
							dataKey={series.key}
							stroke={`var(--color-${series.key})`}
							strokeWidth={2}
							dot={false}
						/>
					))}
				</LineChart>
			) : (
				<BarChart accessibilityLayer data={chart.rows}>
					{parts}
					{chart.series.map((series) => (
						<Bar
							key={series.key}
							dataKey={series.key}
							fill={`var(--color-${series.key})`}
							radius={2}
						/>
					))}
				</BarChart>
			)}
		</ChartContainer>
	)
}
