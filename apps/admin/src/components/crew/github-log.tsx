import { useSuspenseQuery } from '@tanstack/react-query'
import {
	CircleCheck,
	CircleDot,
	GitMerge,
	GitPullRequest,
	GitPullRequestClosed,
	type LucideIcon,
} from 'lucide-react'
import {
	type CrewMessageType,
	type GithubEventType,
	type GithubItemType,
} from '../../../shared/crew'
import { githubLogQuery } from '~/lib/crew'
import { dayLabel, timeLabel } from '~/lib/format'
import { Empty, Section } from './workspace-parts'

// Titles and labels are anyone's text on a public repository. Everything
// here renders them as React text, never through CrewText's Markdown.

const icon = (
	kind: GithubItemType['kind'],
	state: GithubItemType['state'] | GithubEventType['action']
): LucideIcon =>
	state === 'merged'
		? GitMerge
		: state === 'closed'
			? kind === 'pr'
				? GitPullRequestClosed
				: CircleCheck
			: kind === 'pr'
				? GitPullRequest
				: CircleDot

// The server only keeps github.com links; this holds if one slips through.
const safeUrl = (url: string) =>
	url.startsWith('https://github.com/') ? url : undefined

const ref = (item: { kind: GithubItemType['kind']; number: number }) =>
	`${item.kind === 'pr' ? 'PR ' : ''}#${item.number}`

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
				const Icon = icon(event.kind, event.action)
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
							{ref(event)} {event.action}
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
					empty="Nothing closed in the last two weeks."
				/>
			</Section>
			<Section title={`Open issues · ${issues.length}`}>
				<ItemList items={issues} empty="No issue is open." />
			</Section>
			<p className="text-muted-foreground text-xs">
				{log.checkedAt
					? `Checked against GitHub ${dayLabel(log.checkedAt)}, ${timeLabel(log.checkedAt)}.`
					: 'Not checked against GitHub yet. GitHub’s webhook adds what changes.'}
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
				const Icon = icon(item.kind, item.state)
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
									{ref(item)}
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
