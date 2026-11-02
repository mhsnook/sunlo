import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
	Check,
	CheckCheck,
	CircleCheck,
	CircleDot,
	GitMerge,
	GitPullRequest,
	GitPullRequestClosed,
	type LucideIcon,
	X,
} from 'lucide-react'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
	GITHUB_CLOSED_DAYS,
	githubRef,
	mergeTicksOf,
	type CrewMessageType,
	type GithubDeployType,
	type GithubEventType,
	type GithubItemType,
	type MergeTicksType,
} from '../../../shared/crew'
import { githubLogQuery } from '~/lib/crew'
import { dayLabel, timeLabel } from '~/lib/format'
import { Empty, Section } from './workspace-parts'

// Titles and labels are anyone's text on a public repository. Everything
// here renders them as React text, never through CrewText's Markdown.

const icons: Record<
	GithubItemType['kind'],
	Record<GithubItemType['state'] | GithubEventType['action'], LucideIcon>
> = {
	issue: {
		open: CircleDot,
		opened: CircleDot,
		reopened: CircleDot,
		closed: CircleCheck,
		merged: GitMerge,
	},
	pr: {
		open: GitPullRequest,
		opened: GitPullRequest,
		reopened: GitPullRequest,
		closed: GitPullRequestClosed,
		merged: GitMerge,
	},
}

// The server only keeps github.com links; this holds if one slips through.
const safeUrl = (url: string) =>
	url.startsWith('https://github.com/') ? url : undefined

// The room's lines for GitHub events, in a timeline: one quiet line each.
export function GithubLines({
	messages,
}: {
	messages: Array<CrewMessageType>
}) {
	const { data: log } = useQuery(githubLogQuery())
	const deploys = log?.deploys ?? []
	// The room keeps builds only since deploysSince; an older line has
	// nothing to tick.
	const deploysSince = log?.deploysSince ?? ''
	return (
		<ul
			className="text-muted-foreground space-y-1 text-xs"
			data-testid="crew-github-lines"
		>
			{messages.map((message) => {
				const event = message.github
				if (!event) return null
				const Icon = icons[event.kind][event.action]
				return (
					<li
						key={message.id}
						className="flex min-w-0 items-center gap-2"
						data-testid="crew-github-line"
						data-key={message.id}
					>
						<Icon className="size-3.5 shrink-0" aria-hidden />
						<a
							href={safeUrl(event.url)}
							target="_blank"
							rel="noreferrer"
							className="text-foreground shrink-0 font-medium hover:underline"
						>
							{githubRef(event)} {event.action}
						</a>
						<span className="min-w-0 truncate" title={event.title}>
							{event.title}
						</span>
						<span className="ms-auto shrink-0">{timeLabel(message.at)}</span>
						{event.action === 'merged' &&
							event.sha &&
							message.at >= deploysSince && (
								<MergeTicks
									mergedAt={message.at}
									deploys={deploys.filter((deploy) => deploy.sha === event.sha)}
								/>
							)}
					</li>
				)
			})}
		</ul>
	)
}

const ticks: Record<
	MergeTicksType,
	{ Icon: LucideIcon; className: string; label: string }
> = {
	merged: { Icon: Check, className: '', label: 'Merged' },
	built: { Icon: CheckCheck, className: '', label: 'Merged and deployed' },
	live: {
		Icon: CheckCheck,
		className: 'text-info-600',
		label: 'Merged, deployed and live',
	},
	failed: {
		Icon: X,
		className: 'text-danger-600',
		label: 'Merged, but a build failed',
	},
}

const outcomeLabels: Record<GithubDeployType['outcome'], string> = {
	deployed: 'deployed',
	failed: 'build failed',
	cancelled: 'build cancelled',
}

const deployLine = (deploy: GithubDeployType) =>
	[
		`${deploy.worker} ${outcomeLabels[deploy.outcome]} ${timeLabel(deploy.builtAt)}`,
		deploy.liveAt
			? `live ${timeLabel(deploy.liveAt)}`
			: deploy.outcome === 'deployed'
				? 'not live yet'
				: null,
	]
		.filter(Boolean)
		.join(' · ')

// One tick when the pull request merged, two once Workers Builds deployed its
// commit, and blue once each Worker answers with it. The tooltip has each step.
function MergeTicks({
	mergedAt,
	deploys,
}: {
	mergedAt: string
	deploys: Array<GithubDeployType>
}) {
	const state = mergeTicksOf(deploys)
	const { Icon, className, label } = ticks[state]
	return (
		<Tooltip>
			<TooltipTrigger
				className={cn('shrink-0 rounded-2xl', className)}
				aria-label={label}
				data-testid="crew-github-ticks"
				data-state={state}
			>
				<Icon className="size-3.5" aria-hidden />
			</TooltipTrigger>
			<TooltipContent>
				<ul className="space-y-0.5">
					<li>Merged {timeLabel(mergedAt)}</li>
					{deploys.length ? (
						deploys.map((deploy) => (
							<li key={deploy.worker}>{deployLine(deploy)}</li>
						))
					) : (
						<li>Waiting for Workers Builds</li>
					)}
				</ul>
			</TooltipContent>
		</Tooltip>
	)
}

// The Product room's details: open pull requests, then what closed lately,
// then open issues.
export function GithubLogSection() {
	const { data: log } = useSuspenseQuery(githubLogQuery())
	const open = log.items.filter((item) => item.state === 'open')
	const prs = open.filter((item) => item.kind === 'pr')
	const issues = open.filter((item) => item.kind === 'issue')
	const closed = log.items.filter((item) => item.state !== 'open')
	return (
		<div className="space-y-5" data-testid="github-log">
			<Section title={`Open pull requests on GitHub · ${prs.length}`}>
				<ItemList items={prs} empty="No pull request is open." />
			</Section>
			<Section title={`Closed lately · ${closed.length}`}>
				<ItemList
					items={closed}
					empty={`Nothing closed in the last ${GITHUB_CLOSED_DAYS} days.`}
				/>
			</Section>
			<Section title={`Open issues · ${issues.length}`}>
				<ItemList items={issues} empty="No issue is open." />
			</Section>
			<p className="text-muted-foreground text-xs">
				{log.checkedAt
					? `Filled from GitHub ${dayLabel(log.checkedAt)}, ${timeLabel(log.checkedAt)}. GitHub’s webhook keeps it current.`
					: 'Not filled from GitHub yet. GitHub’s webhook adds what changes.'}
			</p>
		</div>
	)
}

const LIST_MAX = 30

function ItemList({
	items,
	empty,
}: {
	items: Array<GithubItemType>
	empty: string
}) {
	if (!items.length) return <Empty>{empty}</Empty>
	const more = items.length - LIST_MAX
	return (
		<ul className="bg-card divide-y rounded border text-sm">
			{items.slice(0, LIST_MAX).map((item) => {
				const Icon = icons[item.kind][item.state]
				return (
					<li
						key={item.number}
						className="flex items-start gap-2.5 px-4 py-2.5"
						data-testid="github-item"
						data-key={item.number}
					>
						<Icon
							className="text-muted-foreground mt-0.5 size-4 shrink-0"
							aria-hidden
						/>
						<div className="min-w-0">
							<a
								href={safeUrl(item.url)}
								target="_blank"
								rel="noreferrer"
								className="hover:underline"
							>
								<span className="text-muted-foreground me-1.5">
									{githubRef(item)}
								</span>
								{item.title}
							</a>
							{(item.labels.length > 0 || item.milestone) && (
								<p className="text-muted-foreground text-xs">
									{[
										...item.labels,
										...(item.milestone ? [`milestone ${item.milestone}`] : []),
									].join(' · ')}
								</p>
							)}
						</div>
					</li>
				)
			})}
			{more > 0 && (
				<li className="text-muted-foreground px-4 py-2.5 text-xs">
					And {more} more on GitHub.
				</li>
			)}
		</ul>
	)
}
