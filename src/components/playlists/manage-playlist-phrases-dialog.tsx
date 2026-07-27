import { useRef, useState } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	ChevronUp,
	ChevronDown,
	ListMusic,
	Trash2,
	LinkIcon,
} from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	type PhrasePlaylistType,
	validateUrl,
} from '@/features/playlists/schemas'
import { playlistPhraseLinksCollection } from '@/features/playlists/collections'
import { useOnePlaylistPhrases } from '@/features/playlists/hooks'
import { useUserId } from '@/lib/use-auth'
import { SelectPhrasesForComment } from '@/components/comments/select-phrases-for-comment'
import { InlinePhraseCreator } from '@/components/phrases/inline-phrase-creator'
import { PhraseSummaryLine } from '../feed/feed-phrase-group-item'
import { DialogClose } from '@/components/ui/dialog'

/** Controlled href input that validates on blur and only fires the mutation when valid */
function HrefInput({
	linkId,
	initialValue,
	onSave,
}: {
	linkId: string
	initialValue: string | null
	onSave: (href: string) => void
}) {
	const [value, setValue] = useState(initialValue ?? '')
	const [error, setError] = useState<string | null>(null)
	const savedRef = useRef(initialValue ?? '')

	const handleBlur = () => {
		// Nothing changed, skip
		if (value === savedRef.current) return
		const urlError = validateUrl(value)
		setError(urlError)
		if (urlError) return
		savedRef.current = value
		onSave(value)
	}

	return (
		<div>
			<div className="flex items-center gap-2">
				<LinkIcon className="text-con-mid ms-2 h-4 w-4 shrink-0" />
				<Input
					type="url"
					placeholder="Timestamp link (optional)"
					value={value}
					data-name="link-href-input"
					data-key={linkId}
					onChange={(e) => {
						setValue(e.target.value)
						if (error) setError(validateUrl(e.target.value))
					}}
					onBlur={handleBlur}
					className={`h-8 text-sm ${error ? 'border-red-500' : ''}`}
				/>
			</div>
			{error && (
				<p
					className="ms-8 mt-1 text-xs text-red-500"
					data-name="link-href-error"
					data-key={linkId}
				>
					{error}
				</p>
			)}
		</div>
	)
}

function removePhrase(linkId: string) {
	const tx = playlistPhraseLinksCollection.delete(linkId)
	tx.isPersisted.promise.then(
		() => toastSuccess('Phrase removed from playlist'),
		(err: unknown) => {
			const message = err instanceof Error ? err.message : 'unknown error'
			toastError(`Failed to remove phrase: ${message}`)
		}
	)
}

function updateHref(linkId: string, href: string) {
	const tx = playlistPhraseLinksCollection.update(linkId, (d) => {
		d.href = href || null
	})
	tx.isPersisted.promise.catch((err: unknown) => {
		const message = err instanceof Error ? err.message : 'unknown error'
		toastError(`Failed to update link: ${message}`)
	})
}

export function ManagePlaylistPhrasesDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [open, setOpen] = useState(false)
	const [showCreateForm, setShowCreateForm] = useState(false)
	const { data: phrasesData } = useOnePlaylistPhrases(playlist.id)
	const userId = useUserId()

	// Track which phrase IDs are already in the playlist
	const currentPhraseIds = phrasesData?.map((p) => p.phrase.id) ?? []

	const addPhrase = (phraseId: string) => {
		if (!userId) return
		if (currentPhraseIds.includes(phraseId)) {
			toastError('Phrase is already in this playlist')
			return
		}
		const maxOrder = Math.max(
			...(phrasesData?.map((p) => p.link.order || 0) ?? [0]),
			0
		)
		const tx = playlistPhraseLinksCollection.insert({
			id: crypto.randomUUID(),
			uid: userId,
			playlist_id: playlist.id,
			phrase_id: phraseId,
			order: maxOrder + 1,
			href: null,
			created_at: new Date().toISOString(),
		})
		tx.isPersisted.promise.then(
			() => toastSuccess('Phrase added to playlist'),
			(err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to add phrase: ${message}`)
			}
		)
	}

	// Swap order values with the adjacent phrase in the requested direction.
	const reorder = (currentIndex: number, direction: 'up' | 'down') => {
		if (!phrasesData) return
		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (targetIndex < 0 || targetIndex >= phrasesData.length) return

		const currentLink = phrasesData[currentIndex].link
		const targetLink = phrasesData[targetIndex].link
		const currentOrder = currentLink.order ?? currentIndex
		const targetOrder = targetLink.order ?? targetIndex

		const tx1 = playlistPhraseLinksCollection.update(currentLink.id, (d) => {
			d.order = targetOrder
		})
		const tx2 = playlistPhraseLinksCollection.update(targetLink.id, (d) => {
			d.order = currentOrder
		})
		Promise.all([tx1.isPersisted.promise, tx2.isPersisted.promise]).catch(
			(err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to reorder: ${message}`)
			}
		)
	}

	// Handle phrase selection from SelectPhrasesForComment
	const handleSelectionChange = (phraseIds: string[]) => {
		// Find newly added phrases
		const newPhraseIds = phraseIds.filter(
			(id) => !currentPhraseIds.includes(id)
		)

		for (const phraseId of newPhraseIds) {
			addPhrase(phraseId)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Manage phrases"
				data-testid="manage-phrases-button"
				onClick={() => setOpen(true)}
			>
				<ListMusic className="h-4 w-4" />
			</Button>
			<DialogContent
				className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden"
				data-testid="manage-phrases-dialog"
			>
				<DialogHeader>
					<DialogTitle>Manage Phrases</DialogTitle>
					<DialogDescription>
						Add, remove, or reorder phrases in "{playlist.title}"
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto pr-4">
					<div className="space-y-3">
						{phrasesData && phrasesData.length > 0 ? (
							phrasesData.map((item, index) => (
								<div
									key={item.link.id}
									className="bg-lum-2 rounded border p-3"
									data-testid="manage-phrase-card"
								>
									<div className="flex items-start gap-2">
										{/* Reorder buttons */}
										<div className="flex flex-col gap-1">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												aria-label="Move phrase up"
												data-name="move-phrase-up-button"
												disabled={index === 0}
												onClick={() => reorder(index, 'up')}
											>
												<ChevronUp className="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												aria-label="Move phrase down"
												data-name="move-phrase-down-button"
												disabled={index === phrasesData.length - 1}
												onClick={() => reorder(index, 'down')}
											>
												<ChevronDown className="h-4 w-4" />
											</Button>
										</div>

										{/* Phrase card */}
										<div className="min-w-0 flex-1">
											<PhraseSummaryLine item={item.phrase} />

											{/* Href input for timestamp */}
											<div className="mt-2">
												<HrefInput
													linkId={item.link.id}
													initialValue={item.link.href}
													onSave={(href) => updateHref(item.link.id, href)}
												/>
											</div>
										</div>

										{/* Delete button */}
										<Button
											type="button"
											onClick={() => removePhrase(item.link.id)}
											variant="ghost"
											size="icon"
											aria-label="Remove phrase"
											data-name="remove-phrase-button"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))
						) : (
							<p className="text-con-mid py-8 text-center">
								No phrases in this playlist yet. Add some below!
							</p>
						)}
					</div>

					{/* Inline phrase creator */}
					{showCreateForm && (
						<div className="border-t pt-4">
							<InlinePhraseCreator
								lang={playlist.lang}
								onPhraseCreated={(phraseId) => {
									addPhrase(phraseId)
								}}
								onCancel={() => setShowCreateForm(false)}
								submitLabel="Add phrase to playlist"
								allowAddAnother
							/>
						</div>
					)}
				</div>

				{/* Action buttons */}
				<div className="flex flex-row flex-wrap justify-between gap-2 border-t pt-4">
					<div className="flex flex-row flex-wrap gap-2">
						{!showCreateForm && (
							<Button
								type="button"
								variant="soft"
								onClick={() => setShowCreateForm(true)}
								data-testid="create-phrase-for-playlist"
							>
								+ Create new phrase
							</Button>
						)}
						<SelectPhrasesForComment
							lang={playlist.lang}
							selectedPhraseIds={currentPhraseIds}
							onSelectionChange={handleSelectionChange}
							maxPhrases={null}
							triggerText="Add existing phrases"
						/>
					</div>
					<DialogClose className="btn btn-size-default btn-variant-default">
						Finish
					</DialogClose>
				</div>
			</DialogContent>
		</Dialog>
	)
}
