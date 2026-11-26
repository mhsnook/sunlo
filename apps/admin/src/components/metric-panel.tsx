import type { DailyActivityType, DailyMetric } from '~/lib/stats'
import { formatCount } from '~/lib/format'
import { DailyBarChart } from './daily-bar-chart'

export function MetricPanel({
	days,
	metric,
	label,
}: {
	days: Array<DailyActivityType>
	metric: DailyMetric
	label: string
}) {
	const total = days.reduce((sum, day) => sum + day[metric], 0)
	return (
		<section
			className="bg-card rounded border p-4"
			data-testid="admin-metric-panel"
			data-key={metric}
		>
			<div className="flex items-baseline justify-between gap-2">
				<h3 className="text-sm font-medium">{label}</h3>
				<span className="text-lg font-semibold tabular-nums">
					{formatCount(total)}
				</span>
			</div>
			<DailyBarChart
				days={days}
				series={[{ metric, label, color: 'var(--chart-1)' }]}
				className="mt-2 h-28"
			/>
		</section>
	)
}
