import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { eq } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import {
	Archive,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronRight,
	Search,
	ThumbsUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { phraseRequestsCollection } from '@/features/requests/collections'
import type { PhraseRequestType } from '@/features/requests/schemas'
import { ago } from '@/lib/dayjs'

export const Route = createFileRoute('/_user/admin/$lang/requests/')({
	component: AdminRequestsIndex,
})

type SortField = 'prompt' | 'upvotes' | 'created'
type SortDir = 'asc' | 'desc'

function AdminRequestsIndex() {
	const { lang } = Route.useParams()
	const { data: requests, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsCollection })
				.where(({ request }) => eq(request.lang, lang)),
		[lang]
	)

	const [search, setSearch] = useState('')
	const [sortField, setSortField] = useState<SortField>('created')
	const [sortDir, setSortDir] = useState<SortDir>('desc')
	const [showArchived, setShowArchived] = useState(false)

	const filtered = useMemo(() => {
		if (!requests) return []
		let result = requests.filter((r) => (showArchived ? r.deleted : !r.deleted))

		if (search) {
			const q = search.toLowerCase()
			result = result.filter((r) => r.prompt.toLowerCase().includes(q))
		}

		result = [...result].toSorted((a, b) => {
			const dir = sortDir === 'asc' ? 1 : -1
			switch (sortField) {
				case 'prompt':
					return dir * a.prompt.localeCompare(b.prompt)
				case 'upvotes':
					return dir * ((a.upvote_count ?? 0) - (b.upvote_count ?? 0))
				case 'created':
					return dir * a.created_at.localeCompare(b.created_at)
			}
		})

		return result
	}, [requests, search, sortField, sortDir, showArchived])

	const toggleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
		} else {
			setSortField(field)
			setSortDir('asc')
		}
	}

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />
		return sortDir === 'asc' ? (
			<ArrowUp className="h-3 w-3" />
		) : (
			<ArrowDown className="h-3 w-3" />
		)
	}

	if (isLoading) return <Loader />

	return (
		<div className="space-y-4" data-testid="admin-requests-table">
			<div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between">
				<div className="relative">
					<Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
					<Input
						placeholder="Search requests..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="ps-9"
					/>
				</div>
				<Button
					size="sm"
					variant={showArchived ? 'soft' : 'ghost'}
					onClick={() => setShowArchived((v) => !v)}
				>
					<Archive className="me-1 h-3 w-3" />
					{showArchived ? 'Showing archived' : 'Show archived'}
				</Button>
			</div>

			<p className="text-muted-foreground text-sm">
				{filtered.length} request{filtered.length !== 1 ? 's' : ''}
			</p>

			{/* Desktop table */}
			<div className="hidden @md:block">
				<div className="rounded border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b">
								<th className="px-3 py-2 text-start font-medium">
									<button
										className="inline-flex items-center gap-1"
										onClick={() => toggleSort('prompt')}
									>
										Prompt <SortIcon field="prompt" />
									</button>
								</th>
								<th className="px-3 py-2 text-start font-medium">
									<button
										className="inline-flex items-center gap-1"
										onClick={() => toggleSort('upvotes')}
									>
										Upvotes <SortIcon field="upvotes" />
									</button>
								</th>
								<th className="px-3 py-2 text-start font-medium">
									<button
										className="inline-flex items-center gap-1"
										onClick={() => toggleSort('created')}
									>
										Created <SortIcon field="created" />
									</button>
								</th>
								<th className="px-3 py-2 text-end font-medium">Action</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((request) => (
								<RequestTableRow
									key={request.id}
									request={request}
									lang={lang}
								/>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Mobile card list */}
			<div className="space-y-2 @md:hidden">
				{filtered.map((request) => (
					<RequestCardRow key={request.id} request={request} lang={lang} />
				))}
			</div>

			{filtered.length === 0 && (
				<p className="text-muted-foreground py-8 text-center">
					No requests found.
				</p>
			)}
		</div>
	)
}

function RequestTableRow({
	request,
	lang,
}: {
	request: PhraseRequestType
	lang: string
}) {
	return (
		<tr
			className={cn(
				'border-b last:border-b-0',
				request.deleted && 'opacity-60'
			)}
		>
			<td className="max-w-[400px] truncate px-3 py-2">
				<span className="flex items-center gap-2">
					{request.deleted && (
						<Archive className="text-muted-foreground h-3 w-3 shrink-0" />
					)}
					{request.prompt}
				</span>
			</td>
			<td className="px-3 py-2">
				<span className="inline-flex items-center gap-1">
					<ThumbsUp className="h-3 w-3" />
					{request.upvote_count ?? 0}
				</span>
			</td>
			<td className="text-muted-foreground px-3 py-2">
				{ago(request.created_at)}
			</td>
			<td className="px-3 py-2 text-end">
				<Link
					to="/admin/$lang/requests/$id"
					params={{ lang, id: request.id }}
					className={buttonVariants({ variant: 'ghost', size: 'icon' })}
					aria-label="View request details"
					data-testid="admin-request-detail-link"
				>
					<ChevronRight className="h-4 w-4" />
				</Link>
			</td>
		</tr>
	)
}

function RequestCardRow({
	request,
	lang,
}: {
	request: PhraseRequestType
	lang: string
}) {
	return (
		<Link
			to="/admin/$lang/requests/$id"
			params={{ lang, id: request.id }}
			data-testid="admin-request-detail-link"
			className={cn(
				'bg-card flex items-center justify-between rounded border p-3',
				request.deleted && 'opacity-60'
			)}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					{request.deleted && (
						<Archive className="text-muted-foreground h-3 w-3 shrink-0" />
					)}
					<p className="truncate font-medium">{request.prompt}</p>
				</div>
				<div className="mt-1 flex items-center gap-3">
					<span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
						<ThumbsUp className="h-3 w-3" />
						{request.upvote_count ?? 0}
					</span>
					<span className="text-muted-foreground text-xs">
						{ago(request.created_at)}
					</span>
				</div>
			</div>
			<ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
		</Link>
	)
}
