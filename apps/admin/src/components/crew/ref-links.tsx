import { Children, type ReactNode } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
	GITHUB_CLOSED_DAYS,
	githubIssueUrl,
	isRoomKey,
	roomNames,
	type GithubItemType,
} from '../../../shared/crew'
import { documentQuery, documentsQuery, githubLogQuery } from '~/lib/crew'
import { CREW, documentLinkOptions, documentStatus } from '~/lib/documents'
import { dayLabel } from '~/lib/format'
import type { RefTarget } from '~/lib/refs'
import { githubIcons, safeGithubUrl } from './github-log'
import { RefCard } from './ref-card'

const refLinkClass = 'text-primary-700 underline'

export function RefLink({
	target,
	children,
}: {
	target: RefTarget
	children: ReactNode
}) {
	return target.kind === 'doc' ? (
		<DocumentLink id={target.id}>{children}</DocumentLink>
	) : (
		<GithubLink number={target.number}>{children}</GithubLink>
	)
}

// Empty link text, as in `[](doc:3)`, shows the document's current name.
// An id no document answers to stays plain text.
function DocumentLink({ id, children }: { id: number; children: ReactNode }) {
	const queryClient = useQueryClient()
	const { data: document } = useQuery({
		...documentsQuery(),
		select: (documents) => documents.find((item) => item.id === id),
	})
	const { room } = useParams({ strict: false })
	if (!document) return <>{children}</>
	return (
		<RefCard
			testId="crew-document-card"
			testKey={document.name}
			onOpen={() => void queryClient.prefetchQuery(documentQuery(id))}
			trigger={
				// Hovering opens the card; preloading the route on that hover
				// would fetch another room's whole log.
				<Link
					preload={false}
					{...documentLinkOptions(
						room && isRoomKey(room) ? room : CREW,
						document
					)}
					className={refLinkClass}
					data-testid="crew-document-link"
					data-key={document.name}
				>
					{Children.count(children) ? children : document.name}
				</Link>
			}
		>
			<p className="font-medium">{document.name}</p>
			<p className="text-muted-foreground mt-1">
				{roomNames[document.room]} · {documentStatus(document)}
			</p>
		</RefCard>
	)
}

// The room's copy holds what is open and what closed in the last
// GITHUB_CLOSED_DAYS, so an older number still links to GitHub, with a card
// that says the copy does not have it.
function GithubLink({
	number,
	children,
}: {
	number: number
	children: ReactNode
}) {
	const { data } = useQuery({
		...githubLogQuery(),
		select: (log) => ({
			repo: log.repo,
			item: log.items.find((item) => item.number === number),
		}),
	})
	if (!data) return <>{children}</>
	const { repo, item } = data
	return (
		<RefCard
			testId="crew-github-card"
			testKey={String(number)}
			trigger={
				<a
					href={item ? safeGithubUrl(item.url) : githubIssueUrl(repo, number)}
					target="_blank"
					rel="noreferrer"
					className={refLinkClass}
					data-testid="crew-github-link"
					data-key={number}
				>
					{children}
				</a>
			}
		>
			{item ? (
				<GithubItemCard item={item} repo={repo} />
			) : (
				<p className="text-muted-foreground">
					{repo} #{number} is not in the room’s copy of GitHub, which keeps what
					is open and what closed in the last {GITHUB_CLOSED_DAYS} days.
				</p>
			)}
		</RefCard>
	)
}

const stateLabels: Record<GithubItemType['state'], string> = {
	open: 'Open',
	closed: 'Closed',
	merged: 'Merged',
}

// GitHub's colours: a closed issue was finished, a closed pull request was
// turned down.
const stateClass = (item: GithubItemType) =>
	item.state === 'open'
		? 'bg-success-100 text-success-800'
		: item.state === 'closed' && item.kind === 'pr'
			? 'bg-danger-100 text-danger-800'
			: 'bg-primary-100 text-primary-800'

// Titles and labels are anyone's text on a public repository: React text
// only, never CrewText.
function GithubItemCard({
	item,
	repo,
}: {
	item: GithubItemType
	repo: string
}) {
	const Icon = githubIcons[item.kind][item.state]
	const at = item.closedAt ?? item.updatedAt
	return (
		<div className="space-y-2">
			<div className="text-muted-foreground flex items-center gap-2 text-xs">
				<span
					className={cn(
						'inline-flex items-center gap-1 rounded-2xl px-2 py-0.5 font-medium',
						stateClass(item)
					)}
				>
					<Icon className="size-3.5" aria-hidden />
					{stateLabels[item.state]}
				</span>
				<span className="truncate">
					{repo} #{item.number}
				</span>
				<span className="ms-auto shrink-0">{dayLabel(at)}</span>
			</div>
			<p className="font-medium">{item.title}</p>
			{(item.labels.length > 0 || item.milestone) && (
				<p className="text-muted-foreground text-xs">
					{[
						...item.labels,
						...(item.milestone ? [`milestone ${item.milestone}`] : []),
					].join(' · ')}
				</p>
			)}
		</div>
	)
}
