import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
	CircleCheck,
	CircleDot,
	GitMerge,
	GitPullRequest,
	GitPullRequestClosed,
	type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
	GITHUB_CLOSED_DAYS,
	githubRef,
	type CrewMessageType,
	type GithubEventType,
	type GithubItemType,
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
					</li>
				)
			})}
		</ul>
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
							<GithubItemMeta item={item} />
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

function GithubItemMeta({ item }: { item: GithubItemType }) {
	if (!item.labels.length && !item.milestone) return null
	return (
		<p className="text-muted-foreground text-xs">
			{[
				...item.labels,
				...(item.milestone ? [`milestone ${item.milestone}`] : []),
			].join(' · ')}
		</p>
	)
}

// GitHub's colours: a closed issue was finished, a closed pull request was
// turned down.
const stateClasses: Record<
	GithubItemType['kind'],
	Record<GithubItemType['state'], string>
> = {
	issue: {
		open: 'bg-success-100 text-success-800',
		closed: 'bg-primary-100 text-primary-800',
		merged: 'bg-primary-100 text-primary-800',
	},
	pr: {
		open: 'bg-success-100 text-success-800',
		closed: 'bg-danger-100 text-danger-800',
		merged: 'bg-primary-100 text-primary-800',
	},
}

// The hover card for a "#854" in an agent's text. It mounts only while the
// card is open, so the log loads on the first hover, not with the page.
export function GithubItemCard({
	number,
	repo,
}: {
	number: number
	repo: string
}) {
	const { data: log, isPending } = useQuery(githubLogQuery())
	if (isPending) return <p className="text-muted-foreground">Loading…</p>
	const item = log?.items.find((entry) => entry.number === number)
	if (!item) {
		return (
			<p className="text-muted-foreground">
				{repo} #{number} is not in the room’s copy of GitHub, which keeps what
				is open and what closed in the last {GITHUB_CLOSED_DAYS} days.
			</p>
		)
	}
	const Icon = icons[item.kind][item.state]
	return (
		<div className="space-y-2">
			<div className="text-muted-foreground flex items-center gap-2 text-xs">
				<span
					className={cn(
						'inline-flex items-center gap-1 rounded-2xl px-2 py-0.5 font-medium capitalize',
						stateClasses[item.kind][item.state]
					)}
				>
					<Icon className="size-3.5" aria-hidden />
					{item.state}
				</span>
				<span className="truncate">
					{repo} {githubRef(item)}
				</span>
				<span className="ms-auto shrink-0">
					{dayLabel(item.closedAt ?? item.updatedAt)}
				</span>
			</div>
			<p className="font-medium">{item.title}</p>
			<GithubItemMeta item={item} />
		</div>
	)
}
