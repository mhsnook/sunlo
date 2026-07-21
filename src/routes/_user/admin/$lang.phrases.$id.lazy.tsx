import { useState } from 'react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import {
	Archive,
	Brain,
	Check,
	ExternalLink,
	Pencil,
	Undo2,
	Users,
	X,
} from 'lucide-react'

import type {
	PhraseFullFilteredType,
	PhraseFullType,
	TranslationType,
} from '@/features/phrases/schemas'
import { Badge, LangBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Separator } from '@/components/ui/separator'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	AdminArchivePhraseButton,
	AdminUnarchivePhraseButton,
} from '@/components/cards/admin-archive-phrase'
import { AddTranslationsDialog } from '@/components/card-pieces/add-translations'
import { AddTags } from '@/components/card-pieces/add-tags'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { useOnePhrase } from '@/features/phrases/hooks'
import {
	phrasesCollection,
	phraseTranslationsCollection,
} from '@/features/phrases/collections'
import { useAuth } from '@/lib/use-auth'
import { ago } from '@/lib/dayjs'
import languages from '@/lib/languages'

export const Route = createLazyFileRoute('/_user/admin/$lang/phrases/$id')({
	component: AdminPhraseDetail,
})

function AdminPhraseDetail() {
	const { id } = Route.useParams()
	const { isAdmin } = useAuth()
	const { data: phrase, isLoading } = useOnePhrase(id)

	if (isLoading) return <Loader />

	if (!phrase) {
		return (
			<Callout variant="problem">
				<p>Phrase not found.</p>
			</Callout>
		)
	}

	return (
		<div className="space-y-6" data-testid="admin-phrase-detail">
			<div className="space-y-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1 space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<LangBadge lang={phrase.lang} />
							{phrase.only_reverse && (
								<Badge variant="outline" className="gap-1">
									Recall only <Brain className="size-3" />
								</Badge>
							)}
							{phrase.archived && (
								<Badge variant="destructive" className="gap-1">
									<Archive className="size-3" /> Archived
								</Badge>
							)}
						</div>
						<EditablePhraseText phrase={phrase} isAdmin={isAdmin} />
					</div>
					{isAdmin && (
						<div className="flex shrink-0 items-center gap-1">
							{phrase.archived ? (
								<AdminUnarchivePhraseButton phraseId={phrase.id} />
							) : (
								<AdminArchivePhraseButton phraseId={phrase.id} />
							)}
						</div>
					)}
				</div>
			</div>

			<Separator />

			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Details</h3>
				<dl className="text-sm">
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Added by
						</dt>
						<dd>
							{phrase.added_by ? (
								<UidPermalink
									uid={phrase.added_by}
									timeValue={phrase.created_at}
								/>
							) : (
								<span className="text-muted-foreground italic">Unknown</span>
							)}
						</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Created
						</dt>
						<dd>{ago(phrase.created_at)}</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Learners
						</dt>
						<dd className="inline-flex items-center gap-1">
							<Users className="h-3 w-3" />
							{phrase.count_learners ?? 0}
						</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Difficulty
						</dt>
						<dd>
							{phrase.avg_difficulty != null
								? `${phrase.avg_difficulty.toFixed(1)} / 10`
								: 'Unknown'}
						</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Phrase ID
						</dt>
						<dd className="text-muted-foreground font-mono text-xs break-all">
							{phrase.id}
						</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Public page
						</dt>
						<dd>
							<Link
								to="/learn/$lang/phrases/$id"
								params={{ lang: phrase.lang, id: phrase.public_id }}
								className="s-link inline-flex items-center gap-1 text-sm"
							>
								View phrase page
								<ExternalLink className="size-3" />
							</Link>
						</dd>
					</div>
				</dl>
			</div>

			<Separator />

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">Tags</h3>
					{isAdmin && (
						<AddTags
							phrase={phrase as unknown as PhraseFullFilteredType}
							allowRemove
						/>
					)}
				</div>
				{phrase.tags && phrase.tags.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{phrase.tags.map((tag) => (
							<Badge key={tag.id} variant="secondary">
								{tag.name}
							</Badge>
						))}
					</div>
				) : (
					<p className="text-muted-foreground italic">No tags</p>
				)}
			</div>

			<Separator />

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">
						Translations ({phrase.translations?.length ?? 0})
					</h3>
					{isAdmin && (
						<AddTranslationsDialog
							phrase={phrase}
							variant="ghost"
							size="icon"
						/>
					)}
				</div>
				{phrase.translations && phrase.translations.length > 0 ? (
					<div className="space-y-2">
						{phrase.translations.map((trans) => (
							<AdminTranslationRow
								key={trans.id}
								translation={trans}
								isAdmin={isAdmin}
							/>
						))}
					</div>
				) : (
					<p className="text-muted-foreground italic">No translations</p>
				)}
			</div>
		</div>
	)
}

function EditablePhraseText({
	phrase,
	isAdmin,
}: {
	phrase: PhraseFullType
	isAdmin: boolean
}) {
	const [isEditing, setIsEditing] = useState(false)
	const [editText, setEditText] = useState(phrase.text)

	const handleSave = () => {
		const trimmed = editText.trim()
		if (!trimmed || trimmed === phrase.text) {
			setIsEditing(false)
			return
		}
		const tx = phrasesCollection.update(phrase.id, (draft) => {
			draft.text = trimmed
		})
		setIsEditing(false)
		tx.isPersisted.promise.then(
			() => toastSuccess('Phrase text updated'),
			(err: Error) => {
				toastError('Failed to update phrase text')
				console.log(`Rolled back phrase text update`, err)
			}
		)
	}

	const handleCancel = () => {
		setEditText(phrase.text)
		setIsEditing(false)
	}

	if (isEditing) {
		return (
			<div className="flex items-center gap-2">
				<Input
					value={editText}
					onChange={(e) => setEditText(e.target.value)}
					className="text-lg font-bold"
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleSave()
						if (e.key === 'Escape') handleCancel()
					}}
				/>
				<Button size="icon" variant="ghost" onClick={handleSave}>
					<Check className="h-4 w-4" />
				</Button>
				<Button size="icon" variant="ghost" onClick={handleCancel}>
					<X className="h-4 w-4" />
				</Button>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<h2 className="text-2xl font-bold">&ldquo;{phrase.text}&rdquo;</h2>
			{isAdmin && (
				<Button
					size="icon"
					variant="ghost"
					className="size-7"
					onClick={() => setIsEditing(true)}
				>
					<Pencil className="size-3.5" />
				</Button>
			)}
		</div>
	)
}

function AdminTranslationRow({
	translation,
	isAdmin,
}: {
	translation: TranslationType
	isAdmin: boolean
}) {
	const [isEditing, setIsEditing] = useState(false)
	const [editText, setEditText] = useState(translation.text)

	const handleSave = () => {
		const trimmed = editText.trim()
		if (!trimmed || trimmed === translation.text) {
			setIsEditing(false)
			return
		}
		const tx = phraseTranslationsCollection.update(translation.id, (draft) => {
			draft.text = trimmed
		})
		setIsEditing(false)
		tx.isPersisted.promise.then(
			() => toastSuccess('Translation updated'),
			(err: Error) => {
				toastError('Failed to update translation')
				console.log(`Rolled back translation update`, err)
			}
		)
	}

	const toggleArchive = () => {
		const wasArchived = translation.archived
		const tx = phraseTranslationsCollection.update(translation.id, (draft) => {
			draft.archived = !wasArchived
		})
		tx.isPersisted.promise.then(
			() =>
				toastSuccess(`Translation ${wasArchived ? 'restored' : 'archived'}`),
			(err: Error) => {
				toastError('Failed to update translation')
				console.log(`Rolled back translation archive toggle`, err)
			}
		)
	}

	const handleCancel = () => {
		setEditText(translation.text)
		setIsEditing(false)
	}

	return (
		<div
			className={`bg-muted/50 rounded-lg p-3 ${translation.archived ? 'opacity-60' : ''}`}
		>
			<div className="flex items-center gap-2">
				<Badge variant="outline">{languages[translation.lang]}</Badge>
				{translation.archived && (
					<Badge variant="destructive" className="gap-1 text-xs">
						<Archive className="size-3" /> Archived
					</Badge>
				)}
			</div>
			<div className="mt-2 flex items-center gap-2">
				{isEditing ? (
					<>
						<Input
							value={editText}
							onChange={(e) => setEditText(e.target.value)}
							className="h-8 flex-1 text-sm"
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleSave()
								if (e.key === 'Escape') handleCancel()
							}}
						/>
						<Button
							size="icon"
							variant="ghost"
							className="size-7"
							onClick={handleSave}
						>
							<Check className="size-3.5" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							className="size-7"
							onClick={handleCancel}
						>
							<X className="size-3.5" />
						</Button>
					</>
				) : (
					<>
						<p className="min-w-0 flex-1 text-sm">{translation.text}</p>
						{isAdmin && !translation.archived && (
							<Button
								size="icon"
								variant="ghost"
								className="size-7"
								onClick={() => setIsEditing(true)}
							>
								<Pencil className="size-3.5" />
							</Button>
						)}
						{isAdmin && (
							<Button
								size="icon"
								variant="ghost"
								className="size-7"
								onClick={toggleArchive}
							>
								{translation.archived ? (
									<Undo2 className="size-3.5" />
								) : (
									<Archive className="text-destructive size-3.5" />
								)}
							</Button>
						)}
					</>
				)}
			</div>
		</div>
	)
}
