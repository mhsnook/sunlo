import { CSSProperties, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { PostgrestError } from '@supabase/supabase-js'
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Bookmark,
	BookmarkCheck,
	BookmarkX,
	ChevronRight,
	ExternalLink,
	Filter,
} from 'lucide-react'

import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'

import { useDeckMeta, useDeckCards } from '@/features/deck/hooks'
import { cardsCollection } from '@/features/deck/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import {
	type CardMetaType,
	CardStatusEnumSchema,
} from '@/features/deck/schemas'
import type { PhraseFullType } from '@/features/phrases/schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { cn, sessionDaysDiff } from '@/lib/utils'
import { calculateInterval } from '@/features/review'
import { Tables } from '@/types/supabase'

export const Route = createFileRoute('/_user/learn/$lang/manage-deck')({
	component: ManageDeckPage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

type PhraseRow = {
	phrase_id: string
	phrase_text: string
	/** Most active status across both directions */
	status: CardMetaType['status']
	/** Soonest due date across both directions */
	last_reviewed_at: string | null
	/** Average difficulty across reviewed directions */
	difficulty: number | null
	/** Lowest stability across directions (drives due date) */
	stability: number | null
	/** All underlying card records for this phrase */
	cards: Array<CardMetaType>
}

type SortField = 'phrase' | 'status' | 'last_reviewed' | 'difficulty'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'learned' | 'skipped'

const statusIcon = {
	active: Bookmark,
	learned: BookmarkCheck,
	skipped: BookmarkX,
} as const

const statusColors = {
	active: 'text-7-hi-primary',
	learned: 'text-7-hi-success',
	skipped: 'text-5-mid-neutral',
} as const

const statusBgColors = {
	active: 'bg-1-lo-primary',
	learned: 'bg-1-lo-success',
	skipped: 'bg-1-lo-neutral',
} as const

const DEFAULT_RETENTION = 0.9

type DueCheckable = Pick<
	PhraseRow,
	'last_reviewed_at' | 'stability' | 'difficulty'
>

function wasReviewedToday(item: DueCheckable): boolean {
	if (!item.last_reviewed_at) return false
	return sessionDaysDiff(item.last_reviewed_at, new Date()) === 0
}

function getDueInfo(item: DueCheckable): {
	label: string
	color: string
} | null {
	if (!item.last_reviewed_at || item.stability == null) return null
	const interval = calculateInterval(DEFAULT_RETENTION, item.stability)
	const lastReview = new Date(item.last_reviewed_at)
	const dueDate = new Date(lastReview)
	dueDate.setDate(dueDate.getDate() + Math.round(interval))
	const daysUntilDue = sessionDaysDiff(new Date(), dueDate)

	if (daysUntilDue < 0) {
		const overdue = Math.abs(daysUntilDue)
		return {
			label: overdue === 1 ? 'Overdue 1d' : `Overdue ${overdue}d`,
			color: 'text-7-hi-danger',
		}
	}
	if (daysUntilDue === 0)
		return { label: 'Due today', color: 'text-7-hi-warning' }
	return {
		label: daysUntilDue === 1 ? 'Due in 1d' : `Due in ${daysUntilDue}d`,
		color: 'text-muted-foreground',
	}
}

function ManageDeckPage() {
	const isAuth = useIsAuthenticated()
	const { lang } = Route.useParams()
	const { data: meta, isReady } = useDeckMeta(lang)

	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to manage your deck.">
				<div />
			</RequireAuth>
		)
	}

	if (!meta)
		if (!isReady) return null
		else throw new Error(`No deck found for language "${lang}"`)

	return (
		<Card style={style} data-testid="manage-deck-page">
			<CardHeader>
				<CardTitle>Manage Deck</CardTitle>
				<ManageDeckSummary lang={lang} />
			</CardHeader>
			<CardContent>
				<ManageDeckTable lang={lang} />
			</CardContent>
		</Card>
	)
}

function useCardData(lang: string) {
	const { data: cards, isLoading: cardsLoading } = useDeckCards(lang)
	const { data: phrases, isLoading: phrasesLoading } = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	) as { data: PhraseFullType[]; isLoading: boolean }

	const [sortField, setSortField] = useState<SortField>('last_reviewed')
	const [sortDir, setSortDir] = useState<SortDir>('desc')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

	// Group cards by phrase, picking the most relevant values
	const phraseRows: Array<PhraseRow> = useMemo(() => {
		if (!cards || !phrases) return []
		const phraseMap = new Map(phrases.map((p) => [p.id, p]))

		// Group cards by phrase_id
		const grouped = new Map<string, Array<CardMetaType>>()
		for (const card of cards) {
			const arr = grouped.get(card.phrase_id)
			if (arr) arr.push(card)
			else grouped.set(card.phrase_id, [card])
		}

		const statusPriority = { active: 0, learned: 1, skipped: 2 } as const

		return [...grouped.entries()]
			.map(([pid, dirCards]) => {
				const phrase = phraseMap.get(pid)
				// Pick the most active status (active > learned > skipped)
				const status = dirCards.reduce(
					(best, c) =>
						statusPriority[c.status] < statusPriority[best] ? c.status : best,
					dirCards[0].status
				)
				// Soonest last_reviewed_at (most recently reviewed direction)
				const reviewed = dirCards
					.map((c) => c.last_reviewed_at)
					.filter(Boolean)
					.toSorted()
					.at(-1) as string | null
				// Average difficulty of reviewed directions
				const diffs = dirCards
					.map((c) => c.difficulty)
					.filter((d): d is number => d != null)
				const difficulty =
					diffs.length > 0 ?
						diffs.reduce((a, b) => a + b, 0) / diffs.length
					:	null
				// Lowest stability (most urgent card drives due date)
				const stabilities = dirCards
					.map((c) => c.stability)
					.filter((s): s is number => s != null)
				const stability =
					stabilities.length > 0 ? Math.min(...stabilities) : null

				return {
					phrase_id: pid,
					phrase_text: phrase?.text ?? '(unknown phrase)',
					status,
					last_reviewed_at: reviewed,
					difficulty,
					stability,
					cards: dirCards,
				}
			})
			.filter((r) => statusFilter === 'all' || r.status === statusFilter)
	}, [cards, phrases, statusFilter])

	const sortedCards = useMemo(() => {
		return [...phraseRows].toSorted((a, b) => {
			const dir = sortDir === 'asc' ? 1 : -1
			switch (sortField) {
				case 'phrase':
					return dir * a.phrase_text.localeCompare(b.phrase_text)
				case 'status':
					return dir * a.status.localeCompare(b.status)
				case 'last_reviewed': {
					const aDate = a.last_reviewed_at ?? ''
					const bDate = b.last_reviewed_at ?? ''
					if (!aDate && !bDate) return 0
					if (!aDate) return 1 // nulls always last
					if (!bDate) return -1
					return dir * aDate.localeCompare(bDate)
				}
				case 'difficulty': {
					if (a.difficulty == null && b.difficulty == null) return 0
					if (a.difficulty == null) return 1 // nulls always last
					if (b.difficulty == null) return -1
					return dir * (a.difficulty - b.difficulty)
				}
				default:
					return 0
			}
		})
	}, [phraseRows, sortField, sortDir])

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
		} else {
			setSortField(field)
			setSortDir(field === 'phrase' ? 'asc' : 'desc')
		}
	}

	// Unfiltered phrase rows for filter counts
	const allPhraseRows: Array<PhraseRow> = useMemo(() => {
		if (!cards || !phrases) return []
		const phraseMap = new Map(phrases.map((p) => [p.id, p]))
		const grouped = new Map<string, Array<CardMetaType>>()
		for (const card of cards) {
			const arr = grouped.get(card.phrase_id)
			if (arr) arr.push(card)
			else grouped.set(card.phrase_id, [card])
		}
		const statusPriority = { active: 0, learned: 1, skipped: 2 } as const
		return [...grouped.entries()].map(([pid, dirCards]) => {
			const phrase = phraseMap.get(pid)
			const status = dirCards.reduce(
				(best, c) =>
					statusPriority[c.status] < statusPriority[best] ? c.status : best,
				dirCards[0].status
			)
			return {
				phrase_id: pid,
				phrase_text: phrase?.text ?? '(unknown phrase)',
				status,
				last_reviewed_at: null,
				difficulty: null,
				stability: null,
				cards: dirCards,
			}
		})
	}, [cards, phrases])

	return {
		allPhraseRows,
		sortedCards,
		isLoading: cardsLoading || phrasesLoading,
		sortField,
		sortDir,
		statusFilter,
		setStatusFilter,
		handleSort,
	}
}

function ManageDeckSummary({ lang }: { lang: string }) {
	const { data: cards } = useDeckCards(lang)
	const phraseIds = new Set((cards ?? []).map((c) => c.phrase_id))
	const byStatus = { active: 0, learned: 0, skipped: 0 }
	const statusPriority = { active: 0, learned: 1, skipped: 2 } as const
	const phraseStatus = new Map<string, CardMetaType['status']>()
	for (const card of cards ?? []) {
		const prev = phraseStatus.get(card.phrase_id)
		if (!prev || statusPriority[card.status] < statusPriority[prev]) {
			phraseStatus.set(card.phrase_id, card.status)
		}
	}
	for (const status of phraseStatus.values()) byStatus[status]++

	return (
		<p className="text-muted-foreground text-sm">
			{phraseIds.size} phrases — {byStatus.active} active, {byStatus.learned}{' '}
			learned, {byStatus.skipped} skipped
		</p>
	)
}

function ManageDeckTable({ lang }: { lang: string }) {
	const {
		allPhraseRows,
		sortedCards,
		isLoading,
		sortField,
		sortDir,
		statusFilter,
		setStatusFilter,
		handleSort,
	} = useCardData(lang)

	if (isLoading) {
		return (
			<div className="text-muted-foreground py-12 text-center text-sm">
				Loading your phrases...
			</div>
		)
	}

	if (!allPhraseRows.length) {
		return (
			<div className="text-muted-foreground py-12 text-center text-sm">
				No phrases in your deck yet.
			</div>
		)
	}

	return (
		<div className="@container space-y-4" data-testid="manage-deck-table">
			{/* Filter bar */}
			<div className="flex flex-wrap items-center gap-2">
				<Filter className="text-muted-foreground size-4" />
				{(['all', 'active', 'learned', 'skipped'] as const).map((filter) => (
					<Button
						key={filter}
						variant={statusFilter === filter ? 'soft' : 'ghost'}
						size="sm"
						onClick={() => setStatusFilter(filter)}
						data-testid={`filter-${filter}`}
					>
						{filter === 'all' ?
							`All (${allPhraseRows.length})`
						:	`${filter.charAt(0).toUpperCase() + filter.slice(1)} (${allPhraseRows.filter((r) => r.status === filter).length})`
						}
					</Button>
				))}
			</div>

			{/* Mobile: tap-to-expand list */}
			<div className="space-y-1 @md:hidden">
				{sortedCards.map((row) => (
					<MobileCardRow key={row.phrase_id} row={row} lang={lang} />
				))}
			</div>

			{/* Desktop: full table */}
			<div className="hidden overflow-x-auto rounded-lg border @md:block">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-1-lo-neutral border-b">
							<SortableHeader
								label="Phrase"
								field="phrase"
								currentField={sortField}
								currentDir={sortDir}
								onSort={handleSort}
								className="text-start"
							/>
							<SortableHeader
								label="Status"
								field="status"
								currentField={sortField}
								currentDir={sortDir}
								onSort={handleSort}
							/>
							<SortableHeader
								label="Next Review"
								field="last_reviewed"
								currentField={sortField}
								currentDir={sortDir}
								onSort={handleSort}
							/>
							<SortableHeader
								label="Difficulty"
								field="difficulty"
								currentField={sortField}
								currentDir={sortDir}
								onSort={handleSort}
							/>
							<th className="px-3 py-2.5 text-end font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{sortedCards.map((row) => (
							<DesktopCardRow key={row.phrase_id} row={row} lang={lang} />
						))}
					</tbody>
				</table>
			</div>

			<p className="text-muted-foreground text-xs">
				Showing {sortedCards.length} of {allPhraseRows.length} phrases
			</p>
		</div>
	)
}

/* ── Mobile: expandable card row ─────────────────────────────── */

function MobileCardRow({ row, lang }: { row: PhraseRow; lang: string }) {
	const [open, setOpen] = useState(false)
	const StatusIconComponent = statusIcon[row.status]
	const dueInfo = getDueInfo(row)
	const reviewedToday = wasReviewedToday(row)
	const difficultyDisplay =
		row.difficulty != null ? Math.round(row.difficulty) : null

	const isSkipped = row.status === 'skipped'

	return (
		<div
			className={cn(
				'rounded-lg border transition-colors',
				open ? 'bg-0-lo-neutral' : 'hover:bg-0-lo-neutral',
				isSkipped && 'opacity-50'
			)}
			data-testid="manage-deck-row"
		>
			{/* Tap target: phrase + status icon */}
			<button
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-3 px-3 py-2.5 text-start"
			>
				<StatusIconComponent
					className={cn('size-4 shrink-0', statusColors[row.status])}
				/>
				<span className="min-w-0 flex-1 text-sm font-medium">
					{row.phrase_text}
				</span>
				<ChevronRight
					className={cn(
						'text-muted-foreground size-4 shrink-0 transition-transform',
						open && 'rotate-90'
					)}
				/>
			</button>

			{/* Expanded details */}
			{open && (
				<div className="space-y-3 border-t px-3 pt-2 pb-3">
					{/* Stats row */}
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
						<span className="text-muted-foreground">
							Status:{' '}
							<span
								className={cn(
									'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
									statusColors[row.status],
									statusBgColors[row.status]
								)}
							>
								{row.status}
							</span>
						</span>
						<span className="text-muted-foreground">
							Next review:{' '}
							{isSkipped ?
								<span className="font-medium">—</span>
							: reviewedToday ?
								<span className="text-primary-foresoft font-medium">
									Reviewed today!
								</span>
							:	<span
									className={cn(
										'font-medium tabular-nums',
										dueInfo?.color ?? 'text-foreground'
									)}
								>
									{dueInfo?.label ?? 'n/a'}
								</span>
							}
						</span>
						<span className="text-muted-foreground">
							Difficulty:{' '}
							<span className="text-foreground font-medium tabular-nums">
								{difficultyDisplay ?? '—'}
							</span>
						</span>
					</div>

					{/* Actions */}
					<div className="flex flex-wrap items-center gap-2">
						<CardStatusActions row={row} />
						<Link
							to="/learn/$lang/phrases/$id"
							params={{ lang, id: row.phrase_id }}
							className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
						>
							<ExternalLink className="size-3" />
							View phrase
						</Link>
					</div>
				</div>
			)}
		</div>
	)
}

/* ── Desktop: table header ───────────────────────────────────── */

function SortableHeader({
	label,
	field,
	currentField,
	currentDir,
	onSort,
	className,
}: {
	label: string
	field: SortField
	currentField: SortField
	currentDir: SortDir
	onSort: (field: SortField) => void
	className?: string
}) {
	const isActive = currentField === field
	const Icon =
		isActive ?
			currentDir === 'asc' ?
				ArrowUp
			:	ArrowDown
		:	ArrowUpDown

	return (
		<th className={className}>
			<button
				onClick={() => onSort(field)}
				className={cn(
					'hover:text-foreground flex w-full items-center gap-1.5 px-3 py-2.5 font-medium transition-colors',
					isActive ? 'text-foreground' : 'text-muted-foreground'
				)}
			>
				{label}
				<Icon className="size-3.5" />
			</button>
		</th>
	)
}

/* ── Desktop: table row ──────────────────────────────────────── */

function DesktopCardRow({ row, lang }: { row: PhraseRow; lang: string }) {
	const StatusIconComponent = statusIcon[row.status]
	const dueInfo = getDueInfo(row)
	const reviewedToday = wasReviewedToday(row)
	const difficultyDisplay =
		row.difficulty != null ? Math.round(row.difficulty) : null

	const isSkipped = row.status === 'skipped'

	return (
		<tr
			className={cn(
				'hover:bg-0-lo-neutral border-b transition-colors last:border-b-0',
				isSkipped && 'opacity-50'
			)}
			data-testid="manage-deck-row"
		>
			{/* Phrase */}
			<td className="max-w-60 px-3 py-2">
				<Link
					to="/learn/$lang/phrases/$id"
					params={{ lang, id: row.phrase_id }}
					className="s-link line-clamp-2 text-sm font-medium"
				>
					{row.phrase_text}
				</Link>
			</td>

			{/* Status */}
			<td className="px-3 py-2">
				<span
					className={cn(
						'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
						statusColors[row.status],
						statusBgColors[row.status]
					)}
				>
					<StatusIconComponent className="size-3" />
					{row.status}
				</span>
			</td>

			{/* Next Review */}
			<td className="px-3 py-2 text-center">
				{isSkipped ?
					<span className="text-muted-foreground/50 text-xs">—</span>
				: reviewedToday ?
					<span className="text-primary-foresoft text-sm font-medium">
						Reviewed today!
					</span>
				: dueInfo ?
					<span className={cn('text-sm tabular-nums', dueInfo.color)}>
						{dueInfo.label}
					</span>
				:	<span className="text-muted-foreground/50 text-xs">n/a</span>}
			</td>

			{/* Difficulty */}
			<td className="px-3 py-2 text-center">
				{difficultyDisplay != null ?
					<span className="text-sm font-medium tabular-nums">
						{difficultyDisplay}
					</span>
				:	<span className="text-muted-foreground/50 text-xs">—</span>}
			</td>

			{/* Actions */}
			<td className="px-3 py-2 text-end">
				<CardStatusActions row={row} />
			</td>
		</tr>
	)
}

/* ── Shared: status change buttons ───────────────────────────── */

function CardStatusActions({ row }: { row: PhraseRow }) {
	const userId = useUserId()

	const mutation = useMutation<
		Array<Tables<'user_card'>>,
		PostgrestError,
		{ status: 'active' | 'learned' | 'skipped' }
	>({
		mutationKey: ['manage-card-status', row.phrase_id],
		mutationFn: async ({ status }) => {
			const { data } = await supabase
				.from('user_card')
				.update({ status })
				.eq('phrase_id', row.phrase_id)
				.eq('uid', userId!)
				.select()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			for (const c of data) {
				cardsCollection.utils.writeUpdate({
					id: c.id,
					status: CardStatusEnumSchema.parse(c.status),
					updated_at: c.updated_at!,
				})
			}
			toastSuccess(`Phrase status changed to "${data[0]?.status}"`)
		},
		onError: (error) => {
			toastError('Failed to update phrase status')
			console.log('Error', error)
		},
	})

	const buttons: Array<{
		status: 'active' | 'learned' | 'skipped'
		label: string
		Icon: typeof Bookmark
	}> = [
		{ status: 'active', label: 'Active', Icon: Bookmark },
		{ status: 'learned', label: 'Learned', Icon: BookmarkCheck },
		{ status: 'skipped', label: 'Skip', Icon: BookmarkX },
	]

	return (
		<div className="flex items-center gap-1">
			{buttons
				.filter((b) => b.status !== row.status)
				.map((b) => (
					<Button
						key={b.status}
						variant="ghost"
						size="sm"
						className="h-7 gap-1 px-2 text-xs"
						disabled={mutation.isPending}
						onClick={() => mutation.mutate({ status: b.status })}
						data-testid={`set-${b.status}-button`}
					>
						<b.Icon className="size-3" />
						{b.label}
					</Button>
				))}
		</div>
	)
}
