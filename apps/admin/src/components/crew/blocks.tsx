import { useState } from 'react'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from 'recharts'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import {
	blockSchemas,
	isBlockKind,
	type ChartBlockType,
	type StatsBlockType,
	type TableBlockType,
} from '../../../shared/blocks'

// Renders one fenced block from an agent's markdown, or returns null for a
// language that is not a component, which the caller shows as code.
export function Block({ kind, source }: { kind: string; source: string }) {
	if (!isBlockKind(kind)) return null
	let parsed: unknown
	try {
		parsed = JSON.parse(source)
	} catch {
		return <BrokenBlock kind={kind} source={source} />
	}
	if (kind === 'chart') {
		const chart = blockSchemas.chart.safeParse(parsed)
		return chart.success ? (
			<ChartBlock chart={chart.data} />
		) : (
			<BrokenBlock kind={kind} source={source} />
		)
	}
	if (kind === 'stats') {
		const stats = blockSchemas.stats.safeParse(parsed)
		return stats.success ? (
			<StatsBlock stats={stats.data} />
		) : (
			<BrokenBlock kind={kind} source={source} />
		)
	}
	const table = blockSchemas.table.safeParse(parsed)
	return table.success ? (
		<TableBlock table={table.data} />
	) : (
		<BrokenBlock kind={kind} source={source} />
	)
}

// The tools refuse broken blocks, so this shows only for text that reached
// the room some other way.
function BrokenBlock({ kind, source }: { kind: string; source: string }) {
	return (
		<details className="text-muted-foreground my-2 text-xs">
			<summary>This {kind} could not be drawn</summary>
			<pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{source}</pre>
		</details>
	)
}

const colors = [
	'var(--chart-1)',
	'var(--color-teal-600)',
	'var(--color-amber-600)',
	'var(--color-neutral-500)',
	'var(--color-rose-600)',
	'var(--color-sky-600)',
]

function ChartBlock({ chart }: { chart: ChartBlockType }) {
	const config: ChartConfig = Object.fromEntries(
		chart.series.map((series, index) => [
			series.key,
			{ label: series.label, color: colors[index % colors.length] },
		])
	)
	const stack = chart.stacked ? 'stack' : undefined
	const axes = [
		<CartesianGrid key="grid" vertical={false} />,
		<XAxis
			key="x"
			dataKey={chart.x}
			tickLine={false}
			axisLine={false}
			minTickGap={16}
		/>,
		<YAxis key="y" tickLine={false} axisLine={false} width={36} />,
		<ChartTooltip key="tooltip" content={<ChartTooltipContent />} />,
		chart.series.length > 1 ? (
			<ChartLegend key="legend" content={<ChartLegendContent />} />
		) : null,
	]
	return (
		<figure
			className="my-3 space-y-1"
			data-testid="crew-block"
			data-key="chart"
		>
			{chart.title && (
				<figcaption className="text-sm font-semibold">{chart.title}</figcaption>
			)}
			<ChartContainer config={config} className="h-56 w-full">
				{chart.type === 'bar' ? (
					<BarChart accessibilityLayer data={chart.rows}>
						{axes}
						{chart.series.map((series) => (
							<Bar
								key={series.key}
								dataKey={series.key}
								stackId={stack}
								fill={`var(--color-${series.key})`}
								radius={2}
							/>
						))}
					</BarChart>
				) : chart.type === 'area' ? (
					<AreaChart accessibilityLayer data={chart.rows}>
						{axes}
						{chart.series.map((series) => (
							<Area
								key={series.key}
								dataKey={series.key}
								stackId={stack}
								stroke={`var(--color-${series.key})`}
								fill={`var(--color-${series.key})`}
								fillOpacity={0.25}
							/>
						))}
					</AreaChart>
				) : (
					<LineChart accessibilityLayer data={chart.rows}>
						{axes}
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
				)}
			</ChartContainer>
			{chart.note && (
				<p className="text-muted-foreground text-xs">{chart.note}</p>
			)}
		</figure>
	)
}

function StatsBlock({ stats }: { stats: StatsBlockType }) {
	return (
		<dl
			className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
			data-testid="crew-block"
			data-key="stats"
		>
			{stats.items.map((item) => (
				<div key={item.label} className="bg-card rounded border px-3 py-2">
					<dt className="text-muted-foreground text-xs">{item.label}</dt>
					<dd className="flex items-baseline gap-2">
						<span className="text-xl font-semibold tabular-nums">
							{typeof item.value === 'number'
								? item.value.toLocaleString()
								: item.value}
						</span>
						{item.change && (
							<span
								className={cn(
									'text-xs font-medium',
									/^[+]/.test(item.change)
										? 'text-teal-700 dark:text-teal-300'
										: /^[−-]/.test(item.change)
											? 'text-danger-700'
											: 'text-muted-foreground'
								)}
							>
								{item.change}
							</span>
						)}
					</dd>
					{item.note && (
						<dd className="text-muted-foreground text-xs">{item.note}</dd>
					)}
				</div>
			))}
		</dl>
	)
}

type Sort = { key: string; descending: boolean }

type CellValue = string | number | null | undefined

function compare(a: CellValue, b: CellValue) {
	if (typeof a === 'number' && typeof b === 'number') return a - b
	return String(a ?? '').localeCompare(String(b ?? ''))
}

function TableBlock({ table }: { table: TableBlockType }) {
	const [filter, setFilter] = useState('')
	const [sort, setSort] = useState<Sort | null>(
		table.sortBy ? { key: table.sortBy, descending: true } : null
	)
	const needle = filter.trim().toLowerCase()
	const rows = table.rows
		.filter(
			(row) =>
				!needle ||
				table.columns.some((column) =>
					String(row[column.key] ?? '')
						.toLowerCase()
						.includes(needle)
				)
		)
		.toSorted((a, b) =>
			sort ? compare(a[sort.key], b[sort.key]) * (sort.descending ? -1 : 1) : 0
		)
	return (
		<figure
			className="my-3 space-y-2"
			data-testid="crew-block"
			data-key="table"
		>
			{(table.title || table.filterable) && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					{table.title && (
						<figcaption className="text-sm font-semibold">
							{table.title}
						</figcaption>
					)}
					{table.filterable && (
						<Input
							value={filter}
							onChange={(event) => setFilter(event.target.value)}
							placeholder="Filter"
							aria-label={`Filter ${table.title ?? 'the table'}`}
							className="h-8 w-40"
							data-testid="crew-block-filter"
						/>
					)}
				</div>
			)}
			<div className="max-h-96 overflow-auto rounded border">
				<table className="w-full text-sm">
					<thead className="bg-muted sticky top-0">
						<tr>
							{table.columns.map((column) => {
								const active = sort?.key === column.key
								return (
									<th
										key={column.key}
										aria-sort={
											active
												? sort.descending
													? 'descending'
													: 'ascending'
												: undefined
										}
										className={cn(
											'px-3 py-1.5 font-medium',
											column.align === 'end' ? 'text-end' : 'text-start'
										)}
									>
										<button
											type="button"
											className="inline-flex items-center gap-1"
											onClick={() =>
												setSort({
													key: column.key,
													descending: active ? !sort.descending : true,
												})
											}
										>
											{column.label}
											{active &&
												(sort.descending ? (
													<ArrowDown className="size-3" />
												) : (
													<ArrowUp className="size-3" />
												))}
										</button>
									</th>
								)
							})}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => (
							<tr key={index} className="border-t">
								{table.columns.map((column) => (
									<td
										key={column.key}
										className={cn(
											'px-3 py-1.5',
											column.align === 'end' && 'text-end tabular-nums'
										)}
									>
										{row[column.key] ?? '—'}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="text-muted-foreground text-xs">
				{rows.length === table.rows.length
					? `${rows.length} rows`
					: `${rows.length} of ${table.rows.length} rows`}
			</p>
		</figure>
	)
}
