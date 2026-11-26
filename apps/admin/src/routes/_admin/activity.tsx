import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
	activityOverviewQuery,
	rangeOptions,
	userActivityQuery,
	type DailyActivityType,
	type DailyMetric,
	type RangeDays,
} from '~/lib/stats'
import { formatCount, formatLongDay } from '~/lib/format'
import { StatTile } from '~/components/stat-tile'
import { DailyBarChart } from '~/components/daily-bar-chart'
import { MetricPanel } from '~/components/metric-panel'
import { MostActiveTable, NewestUsersTable } from '~/components/user-tables'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'

type DashboardSearch = { days?: RangeDays }

const defaultDays: RangeDays = 7

export const Route = createFileRoute('/_admin/activity')({
	validateSearch: (search: Record<string, unknown>): DashboardSearch => {
		const days = Number(search.days)
		return rangeOptions.includes(days as RangeDays)
			? { days: days as RangeDays }
			: {}
	},
	loaderDeps: ({ search }) => ({ days: search.days ?? defaultDays }),
	loader: async ({ context, deps }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(activityOverviewQuery(deps.days)),
			context.queryClient.ensureQueryData(userActivityQuery(deps.days)),
		])
	},
	component: Dashboard,
})

const deckMetrics: Array<{ metric: DailyMetric; label: string }> = [
	{ metric: 'reviews', label: 'Card reviews' },
	{ metric: 'reviewers', label: 'People reviewing (daily)' },
	{ metric: 'cards_added', label: 'Phrases added to decks' },
	{ metric: 'decks_created', label: 'Decks started' },
]

const libraryMetrics: Array<{ metric: DailyMetric; label: string }> = [
	{ metric: 'phrases_added', label: 'Phrases added' },
	{ metric: 'translations_added', label: 'Translations added' },
	{ metric: 'requests_added', label: 'Phrase requests' },
	{ metric: 'comments_added', label: 'Request comments' },
	{ metric: 'playlists_added', label: 'Playlists' },
	{ metric: 'chat_messages', label: 'Friend chat messages' },
]

function Dashboard() {
	const { days = defaultDays } = Route.useSearch()
	const { data: overview } = useSuspenseQuery(activityOverviewQuery(days))
	const { data: users } = useSuspenseQuery(userActivityQuery(days))
	const { totals } = overview
	const periodLabel = `${days} days`

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<MobileSidebarButton />
				<div className="me-auto">
					<h1 className="text-2xl font-semibold">Activity</h1>
					<p className="text-muted-foreground text-sm">
						Last {periodLabel}, in UTC calendar days
					</p>
				</div>
				<RangePicker days={days} />
			</div>

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<StatTile
					label="Active users"
					value={totals.active_users}
					previous={totals.active_users_prev}
					periodLabel={periodLabel}
				/>
				<StatTile
					label="New users"
					value={totals.new_users}
					previous={totals.new_users_prev}
					periodLabel={periodLabel}
				/>
				<StatTile
					label="Card reviews"
					value={totals.reviews}
					previous={totals.reviews_prev}
					periodLabel={periodLabel}
				/>
				<StatTile
					label="All users"
					value={totals.total_users}
					note={`${formatCount(totals.onboarded_users)} picked a username`}
				/>
			</div>

			<section className="bg-card rounded border p-4">
				<h2 className="font-semibold">Active and new users per day</h2>
				<p className="text-muted-foreground text-sm">
					Active means the person reviewed, added or wrote something that day.
				</p>
				<DailyBarChart
					days={overview.days}
					series={[
						{
							metric: 'active_users',
							label: 'Active users',
							color: 'var(--chart-1)',
						},
						{
							metric: 'new_users',
							label: 'New users',
							color: 'var(--color-teal-600)',
						},
					]}
					showYAxis
					className="mt-4 h-64"
				/>
			</section>

			<MetricSection
				title="Deck activity"
				metrics={deckMetrics}
				days={overview.days}
			/>
			<MetricSection
				title="Library and community activity"
				metrics={libraryMetrics}
				days={overview.days}
			/>

			<MostActiveTable users={users.most_active} periodLabel={periodLabel} />
			<NewestUsersTable users={users.newest} />

			<DailyTable days={overview.days} />
		</div>
	)
}

function RangePicker({ days }: { days: RangeDays }) {
	return (
		<nav
			aria-label="Date range"
			className="bg-card flex gap-1 rounded-2xl border p-1"
		>
			{rangeOptions.map((option) => (
				<Link
					key={option}
					to="/activity"
					search={{ days: option }}
					data-testid="admin-range-option"
					data-key={option}
					aria-current={option === days ? 'page' : undefined}
					className={cn(
						'rounded-xl px-3 py-1 text-sm',
						option === days
							? 'bg-primary-700 text-paper'
							: 'hover:bg-neutral-200'
					)}
				>
					{option} days
				</Link>
			))}
		</nav>
	)
}

function MetricSection({
	title,
	metrics,
	days,
}: {
	title: string
	metrics: Array<{ metric: DailyMetric; label: string }>
	days: Array<DailyActivityType>
}) {
	return (
		<section className="space-y-3">
			<h2 className="font-semibold">{title}</h2>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{metrics.map(({ metric, label }) => (
					<MetricPanel key={metric} days={days} metric={metric} label={label} />
				))}
			</div>
		</section>
	)
}

const tableColumns: Array<{ metric: DailyMetric; label: string }> = [
	{ metric: 'active_users', label: 'Active' },
	{ metric: 'new_users', label: 'New' },
	...deckMetrics,
	...libraryMetrics,
]

function DailyTable({ days }: { days: Array<DailyActivityType> }) {
	return (
		<details className="bg-card rounded border">
			<summary className="cursor-pointer px-4 py-3 font-semibold">
				Daily numbers
			</summary>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-y">
							<th className="px-3 py-2 text-start font-medium">Day</th>
							{tableColumns.map((column) => (
								<th
									key={column.metric}
									className="px-3 py-2 text-end font-medium"
								>
									{column.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{days.toReversed().map((day) => (
							<tr key={day.day} className="border-b last:border-0">
								<td className="px-3 py-2 whitespace-nowrap">
									{formatLongDay(day.day)}
								</td>
								{tableColumns.map((column) => (
									<td
										key={column.metric}
										className="px-3 py-2 text-end tabular-nums"
									>
										{formatCount(day[column.metric])}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</details>
	)
}
