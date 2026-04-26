import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
	Archive,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronRight,
	Search,
	Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLangPhrasesRaw } from '@/features/phrases/hooks'
import type { PhraseFullType } from '@/features/phrases/schemas'
import { ago } from '@/lib/dayjs'

export const Route = createFileRoute('/_user/admin/$lang/phrases/')({
	component: AdminPhrasesIndex,
})

type SortField = 'text' | 'learners' | 'created'
type SortDir = 'asc' | 'desc'

function AdminPhrasesIndex() {
	const { lang } = Route.useParams()
	const { data: phrases, isLoading } = useLangPhrasesRaw(lang)

	const [search, setSearch] = useState('')
	const [sortField, setSortField] = useState<SortField>('created')
	const [sortDir, setSortDir] = useState<SortDir>('desc')
	const [showArchived, setShowArchived] = useState(false)

	const filtered = useMemo(() => {
		if (!phrases) return []
		let result = phrases.filter((p) =>
			showArchived ? p.archived : !p.archived
		)

		if (search) {
			const q = search.toLowerCase()
			result = result.filter((p) => p.text.toLowerCase().includes(q))
		}

		result = [...result].toSorted((a, b) => {
			const dir = sortDir === 'asc' ? 1 : -1
			switch (sortField) {
				case 'text':
					return dir * a.text.localeCompare(b.text)
				case 'learners':
					return dir * ((a.count_learners ?? 0) - (b.count_learners ?? 0))
				case 'created':
					return dir * a.created_at.localeCompare(b.created_at)
			}
		})

		return result
	}, [phrases, search, sortField, sortDir, showArchived])

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
		<div className="space-y-4" data-testid="admin-phrases-table">
			<div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between">
				<div className="relative">
					<Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
					<Input
						placeholder="Search phrases..."
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
				{filtered.length} phrase{filtered.length !== 1 ? 's' : ''}
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
										onClick={() => toggleSort('text')}
									>
										Phrase <SortIcon field="text" />
									</button>
								</th>
								<th className="px-3 py-2 text-start font-medium">Tags</th>
								<th className="px-3 py-2 text-start font-medium">
									<button
										className="inline-flex items-center gap-1"
										onClick={() => toggleSort('learners')}
									>
										Learners <SortIcon field="learners" />
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
							{filtered.map((phrase) => (
								<PhraseTableRow key={phrase.id} phrase={phrase} lang={lang} />
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Mobile card list */}
			<div className="space-y-2 @md:hidden">
				{filtered.map((phrase) => (
					<PhraseCardRow key={phrase.id} phrase={phrase} lang={lang} />
				))}
			</div>

			{filtered.length === 0 && (
				<p className="text-muted-foreground py-8 text-center">
					No phrases found.
				</p>
			)}
		</div>
	)
}

function PhraseTableRow({
	phrase,
	lang,
}: {
	phrase: PhraseFullType
	lang: string
}) {
	return (
		<tr
			className={cn(
				'border-b last:border-b-0',
				phrase.archived && 'opacity-60'
			)}
		>
			<td className="max-w-[300px] truncate px-3 py-2">
				<span className="flex items-center gap-2">
					{phrase.archived && (
						<Archive className="text-muted-foreground h-3 w-3 shrink-0" />
					)}
					{phrase.text}
				</span>
			</td>
			<td className="px-3 py-2">
				<div className="flex flex-wrap gap-1">
					{phrase.tags?.map((tag) => (
						<Badge key={tag.id} variant="secondary" className="text-xs">
							{tag.name}
						</Badge>
					))}
				</div>
			</td>
			<td className="px-3 py-2">
				<span className="inline-flex items-center gap-1">
					<Users className="h-3 w-3" />
					{phrase.count_learners ?? 0}
				</span>
			</td>
			<td className="text-muted-foreground px-3 py-2">
				{ago(phrase.created_at)}
			</td>
			<td className="px-3 py-2 text-end">
				<Link
					to="/admin/$lang/phrases/$id"
					params={{ lang, id: phrase.id }}
					className={buttonVariants({ variant: 'ghost', size: 'icon' })}
					aria-label="View phrase details"
					data-testid="admin-phrase-detail-link"
				>
					<ChevronRight className="h-4 w-4" />
				</Link>
			</td>
		</tr>
	)
}

function PhraseCardRow({
	phrase,
	lang,
}: {
	phrase: PhraseFullType
	lang: string
}) {
	return (
		<Link
			to="/admin/$lang/phrases/$id"
			params={{ lang, id: phrase.id }}
			data-testid="admin-phrase-detail-link"
			className={cn(
				'bg-card flex items-center justify-between rounded border p-3',
				phrase.archived && 'opacity-60'
			)}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					{phrase.archived && (
						<Archive className="text-muted-foreground h-3 w-3 shrink-0" />
					)}
					<p className="truncate font-medium">{phrase.text}</p>
				</div>
				<div className="mt-1 flex items-center gap-3">
					<span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
						<Users className="h-3 w-3" />
						{phrase.count_learners ?? 0}
					</span>
					<span className="text-muted-foreground text-xs">
						{ago(phrase.created_at)}
					</span>
				</div>
				{phrase.tags && phrase.tags.length > 0 && (
					<div className="mt-1.5 flex flex-wrap gap-1">
						{phrase.tags.map((tag) => (
							<Badge key={tag.id} variant="secondary" className="text-xs">
								{tag.name}
							</Badge>
						))}
					</div>
				)}
			</div>
			<ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
		</Link>
	)
}
