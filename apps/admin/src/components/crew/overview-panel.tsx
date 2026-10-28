import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
	activityOverviewQuery,
	rangeOptions,
	type DailyActivityType,
	type DailyMetric,
	type RangeDays,
} from '~/lib/stats'
import { formatChange, formatCount } from '~/lib/format'
import { DailyBarChart } from '~/components/daily-bar-chart'
import { SidePanel } from './side-panel'

export function OverviewPanel({ onClose }: { onClose: () => void }) {
	const [days, setDays] = useState<RangeDays>(7)
	const overview = useQuery(activityOverviewQuery(days))

	return (
		<SidePanel
			title="Overview"
			testId="crew-overview"
			onClose={onClose}
			bodyClassName="space-y-3"
			actions={
				<nav
					aria-label="Date range"
					className="flex gap-1 rounded-2xl border p-0.5"
				>
					{rangeOptions.map((option) => (
						<Button
							key={option}
							size="sm"
							variant={option === days ? 'default' : 'neutral'}
							data-testid="crew-overview-range"
							data-key={option}
							aria-pressed={option === days}
							onClick={() => setDays(option)}
							className="h-6 px-2 text-xs shadow-none"
						>
							{option} days
						</Button>
					))}
				</nav>
			}
		>
			<section className="rounded border border-dashed p-3 text-sm">
				<p className="flex items-center gap-2 font-medium">
					<Activity className="size-4" /> No health checks yet
				</p>
				<p className="text-muted-foreground mt-1 text-xs">
					Geordi will report on the app, auth, the database and search after
					each deploy, once it runs health checks.
				</p>
			</section>
			{overview.data ? (
				<>
					<OverviewCard
						label="Active users"
						value={overview.data.totals.active_users}
						note={`${formatChange(overview.data.totals.active_users, overview.data.totals.active_users_prev)} on the ${days} days before`}
						days={overview.data.days}
						metrics={['active_users']}
					/>
					<OverviewCard
						label="Signups"
						value={overview.data.totals.new_users}
						note={`${formatChange(overview.data.totals.new_users, overview.data.totals.new_users_prev)} on the ${days} days before`}
						days={overview.data.days}
						metrics={['new_users']}
					/>
					<OverviewCard
						label="Card reviews"
						value={overview.data.totals.reviews}
						note={`${formatChange(overview.data.totals.reviews, overview.data.totals.reviews_prev)} on the ${days} days before`}
						days={overview.data.days}
						metrics={['reviews']}
					/>
					<OverviewCard
						label="Library"
						days={overview.data.days}
						metrics={['phrases_added', 'comments_added', 'requests_added']}
					/>
					<Link
						to="/activity"
						search={{ days }}
						className="text-primary-700 block text-center text-sm underline"
					>
						All activity
					</Link>
				</>
			) : overview.isError ? (
				<p className="text-danger-700 text-sm">{overview.error.message}</p>
			) : (
				<Loader className="mx-auto mt-10 opacity-50" />
			)}
		</SidePanel>
	)
}

const metricLabels: Partial<Record<DailyMetric, string>> = {
	active_users: 'Active users',
	new_users: 'Signups',
	reviews: 'Card reviews',
	phrases_added: 'Phrases',
	comments_added: 'Comments',
	requests_added: 'Requests',
}

const colors = [
	'var(--chart-1)',
	'var(--color-teal-600)',
	'var(--color-neutral-500)',
]

function OverviewCard({
	label,
	value,
	note,
	days,
	metrics,
}: {
	label: string
	value?: number
	note?: string
	days: Array<DailyActivityType>
	metrics: Array<DailyMetric>
}) {
	return (
		<section
			className="bg-card rounded border p-3"
			data-testid="crew-overview-card"
			data-key={metrics.join()}
		>
			<div className="flex items-baseline justify-between">
				<h3 className="text-sm font-semibold">{label}</h3>
				{value !== undefined && (
					<span className="text-xl font-semibold tabular-nums">
						{formatCount(value)}
					</span>
				)}
			</div>
			{metrics.length > 1 && (
				<p className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 text-xs">
					{metrics.map((metric, index) => (
						<span key={metric} className="flex items-center gap-1">
							<span
								className="inline-block h-0.5 w-3"
								style={{ background: colors[index] }}
							/>
							{metricLabels[metric]}{' '}
							<span className="text-foreground font-semibold">
								{formatCount(days.reduce((sum, day) => sum + day[metric], 0))}
							</span>
						</span>
					))}
				</p>
			)}
			<DailyBarChart
				days={days}
				series={metrics.map((metric, index) => ({
					metric,
					label: metricLabels[metric] ?? metric,
					color: colors[index],
				}))}
				className="mt-2 h-20"
			/>
			{note && (
				<p className="text-muted-foreground mt-1 text-center text-xs">{note}</p>
			)}
		</section>
	)
}
