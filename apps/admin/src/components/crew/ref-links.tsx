import { Children, type ReactNode } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { githubIssueUrl, isRoomKey, roomNames } from '../../../shared/crew'
import { documentQuery, documentsQuery, roomQuery } from '~/lib/crew'
import { CREW, documentLinkOptions, documentStatus } from '~/lib/documents'
import type { RefTarget } from '~/lib/refs'
import { GithubItemCard } from './github-log'
import { RefCard } from './ref-card'

const refLinkClass = 'text-primary-700 underline'

export function RefLink({
	target,
	children,
}: {
	target: RefTarget
	children: ReactNode
}) {
	switch (target.kind) {
		case 'doc':
			return <DocumentLink id={target.id}>{children}</DocumentLink>
		case 'github':
			return <GithubLink number={target.number}>{children}</GithubLink>
		default:
			return target satisfies never
	}
}

// Empty link text, as in `[](doc:3)`, shows the document's current name.
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

// The link needs only the repository, which the room snapshot carries; the
// GitHub log loads inside the card.
function GithubLink({
	number,
	children,
}: {
	number: number
	children: ReactNode
}) {
	const { data: repo } = useQuery({
		...roomQuery(),
		select: (room) => room.githubRepo,
	})
	if (!repo) return <>{children}</>
	return (
		<RefCard
			testId="crew-github-card"
			testKey={String(number)}
			trigger={
				<a
					href={githubIssueUrl(repo, number)}
					target="_blank"
					rel="noreferrer"
					className={refLinkClass}
					data-testid="crew-github-link"
					data-key={number}
				>
					{Children.count(children) ? children : `#${number}`}
				</a>
			}
		>
			<GithubItemCard number={number} repo={repo} />
		</RefCard>
	)
}
