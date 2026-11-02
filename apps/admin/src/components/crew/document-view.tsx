import { useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { History, Pencil, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { documentMax, type DocumentType } from '../../../shared/crew'
import { documentQuery, revisionQuery, useSaveDocument } from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { documentStatus } from '~/lib/documents'
import { CrewText } from './crew-parts'
import { Empty } from './workspace-parts'

type Mode =
	| { kind: 'read' }
	| { kind: 'edit'; base: number; draft: string; summary: string }
	| { kind: 'revision'; revision: number }

const fail = (error: Error) => toastError(error.message)

// One room document: its current text, an editor, and its revisions, any of
// which the admin can view and restore. `showName` is false where the panel
// title already names it.
export function DocumentView({
	id,
	showName = true,
}: {
	id: number
	showName?: boolean
}) {
	const { data: document } = useSuspenseQuery(documentQuery(id))
	const [mode, setMode] = useState<Mode>({ kind: 'read' })
	const [historyOpen, setHistoryOpen] = useState(false)
	const startEditing = () =>
		setMode({
			kind: 'edit',
			base: document.revision,
			draft: document.text,
			summary: '',
		})

	return (
		<article
			className="space-y-4"
			data-testid="document"
			data-key={document.name}
		>
			<header className="flex items-start gap-2">
				<div className="me-auto min-w-0">
					{showName && <h3 className="font-semibold">{document.name}</h3>}
					<p className="text-muted-foreground text-xs">
						{documentStatus(document)}
					</p>
				</div>
				{mode.kind !== 'edit' && (
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Edit ${document.name}`}
						data-testid="document-edit"
						onClick={startEditing}
					>
						<Pencil />
					</Button>
				)}
				{document.revisions.length > 0 && (
					<Button
						variant="ghost"
						size="icon"
						aria-label={`${document.name} history`}
						aria-pressed={historyOpen}
						data-testid="document-history-button"
						onClick={() => setHistoryOpen((open) => !open)}
					>
						<History />
					</Button>
				)}
			</header>
			{historyOpen && (
				<RevisionList
					document={document}
					viewing={mode.kind === 'revision' ? mode.revision : null}
					onView={(revision) =>
						setMode(
							revision === document.revision
								? { kind: 'read' }
								: { kind: 'revision', revision }
						)
					}
				/>
			)}
			{mode.kind === 'edit' ? (
				<DocumentEditor
					document={document}
					mode={mode}
					onChange={setMode}
					onDone={() => setMode({ kind: 'read' })}
					onStartAgain={startEditing}
				/>
			) : mode.kind === 'revision' ? (
				<RevisionView
					document={document}
					revision={mode.revision}
					onBack={() => setMode({ kind: 'read' })}
				/>
			) : document.text ? (
				<div className="text-sm" data-testid="document-text">
					<CrewText text={document.text} />
				</div>
			) : (
				<Empty>Nobody has written {document.name} yet.</Empty>
			)}
		</article>
	)
}

function DocumentEditor({
	document,
	mode,
	onChange,
	onDone,
	onStartAgain,
}: {
	document: DocumentType
	mode: Extract<Mode, { kind: 'edit' }>
	onChange: (mode: Mode) => void
	onDone: () => void
	onStartAgain: () => void
}) {
	const save = useSaveDocument(document)
	// Someone saved while the admin was editing: the server refuses a save
	// from the old revision, so the editor says so before they try. This
	// editor's own save brings a new revision too, through the socket or
	// the refetch, before `onDone` closes it. A save that loses to another
	// one fails, and then counts as stale.
	const stale =
		document.revision !== mode.base && !save.isPending && !save.isSuccess
	const max = documentMax(document.name)
	return (
		<div className="space-y-2">
			{stale && (
				<p
					className="bg-warning-50 border-warning-200 text-warning-900 flex gap-2 rounded border p-2 text-xs"
					data-testid="document-stale"
				>
					<TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
					<span>
						{document.byName} saved revision {document.revision} while you were
						editing, so this draft cannot be saved. Copy what you need from it,
						then{' '}
						<button
							type="button"
							className="font-medium underline"
							onClick={onStartAgain}
						>
							start again from revision {document.revision}
						</button>
						.
					</span>
				</p>
			)}
			<Textarea
				value={mode.draft}
				onChange={(event) => onChange({ ...mode, draft: event.target.value })}
				rows={18}
				maxLength={max}
				className="font-mono text-xs"
				aria-label={`${document.name}, in Markdown`}
				data-testid="document-editor"
			/>
			<Input
				value={mode.summary}
				onChange={(event) => onChange({ ...mode, summary: event.target.value })}
				maxLength={140}
				placeholder="What changed, in one line (optional)"
				aria-label="What changed"
				data-testid="document-summary"
			/>
			<div className="flex justify-end gap-2">
				<Button variant="neutral" size="sm" onClick={onDone}>
					Cancel
				</Button>
				<Button
					size="sm"
					disabled={stale || save.isPending || !mode.draft.trim()}
					data-testid="document-save"
					onClick={() =>
						save.mutate(
							{
								text: mode.draft,
								summary: mode.summary,
								baseRevision: mode.base,
							},
							{ onSuccess: onDone, onError: fail }
						)
					}
				>
					Save
				</Button>
			</div>
		</div>
	)
}

function RevisionList({
	document,
	viewing,
	onView,
}: {
	document: DocumentType
	viewing: number | null
	onView: (revision: number) => void
}) {
	const shown = viewing ?? document.revision
	return (
		<ol
			className="bg-card divide-y rounded border text-xs"
			data-testid="document-revisions"
		>
			{document.revisions.map((revision) => (
				<li key={revision.revision}>
					<button
						type="button"
						className={cn(
							'hover:bg-muted flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start',
							revision.revision === shown && 'bg-primary-50'
						)}
						aria-current={revision.revision === shown}
						data-testid="document-revision"
						data-key={revision.revision}
						onClick={() => onView(revision.revision)}
					>
						<span className="font-medium">
							Revision {revision.revision}
							{revision.revision === document.revision && ' (current)'}
						</span>
						{revision.summary && <span>{revision.summary}</span>}
						<span className="text-muted-foreground">
							{revision.byName}, {dayLabel(revision.at)}
						</span>
					</button>
				</li>
			))}
		</ol>
	)
}

function RevisionView({
	document,
	revision,
	onBack,
}: {
	document: DocumentType
	revision: number
	onBack: () => void
}) {
	const old = useQuery(revisionQuery(document.id, revision))
	const save = useSaveDocument(document)
	return (
		<div className="space-y-3" data-testid="document-old-revision">
			<div className="bg-muted flex flex-wrap items-center gap-2 rounded p-2 text-xs">
				<span className="me-auto">
					Revision {revision}, from {old.data ? dayLabel(old.data.at) : '…'}
				</span>
				<Button variant="neutral" size="sm" onClick={onBack}>
					Back to the current revision
				</Button>
				<Button
					size="sm"
					disabled={save.isPending}
					data-testid="document-restore"
					onClick={() =>
						save.mutate(
							{ restores: revision, baseRevision: document.revision },
							{ onSuccess: onBack, onError: fail }
						)
					}
				>
					Restore it
				</Button>
			</div>
			{old.data ? (
				<div className="text-sm">
					<CrewText text={old.data.text} />
				</div>
			) : old.isError ? (
				<p className="text-danger-700 text-sm">{old.error.message}</p>
			) : (
				<Empty>Loading revision {revision}…</Empty>
			)}
		</div>
	)
}
