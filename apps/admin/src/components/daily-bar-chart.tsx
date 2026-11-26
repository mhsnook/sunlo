import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { DailyActivityType, DailyMetric } from '~/lib/stats'
import { formatLongDay, formatShortDay } from '~/lib/format'

export type ChartSeries = {
	metric: DailyMetric
	label: string
	color: string
}

export function DailyBarChart({
	days,
	series,
	showYAxis = false,
	className,
}: {
	days: Array<DailyActivityType>
	series: Array<ChartSeries>
	showYAxis?: boolean
	className?: string
}) {
	const config: ChartConfig = Object.fromEntries(
		series.map((s) => [s.metric, { label: s.label, color: s.color }])
	)

	return (
		<ChartContainer config={config} className={cn('w-full', className)}>
			<BarChart accessibilityLayer data={days} barGap={2} barCategoryGap="20%">
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="day"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={16}
					tickFormatter={formatShortDay}
					stroke="var(--muted-foreground)"
				/>
				<YAxis
					hide={!showYAxis}
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					width={32}
					stroke="var(--muted-foreground)"
				/>
				<ChartTooltip
					cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
					// oxlint-disable-next-line jsx-no-jsx-as-prop
					content={
						<ChartTooltipContent
							indicator="dot"
							labelFormatter={(day: string) => formatLongDay(day)}
						/>
					}
				/>
				{series.length > 1 && (
					// oxlint-disable-next-line jsx-no-jsx-as-prop
					<ChartLegend content={<ChartLegendContent />} />
				)}
				{series.map((s) => (
					<Bar
						key={s.metric}
						dataKey={s.metric}
						fill={`var(--color-${s.metric})`}
						radius={[4, 4, 0, 0]}
						maxBarSize={40}
					/>
				))}
			</BarChart>
		</ChartContainer>
	)
}
