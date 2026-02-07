import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import type { PhrasePlaylistType } from '@/lib/schemas-playlist'
import supabase from '@/lib/supabase-client'
import { playlistPhraseLinksCollection } from '@/lib/collections'
import { useOnePlaylistPhrases } from '@/hooks/use-playlists'
import { SelectPhrasesForComment } from '@/components/comments/select-phrases-for-comment'
import { PhraseSummaryLine } from '../feed/feed-phrase-group-item'
import { DialogClose } from '@radix-ui/react-dialog'
import { buttonVariants } from '../ui/button'

export function ManagePlaylistPhrasesDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [open, setOpen] = useState(false)
	const { data: phrasesData } = useOnePlaylistPhrases(playlist.id)

	// Track which phrase IDs are already in the playlist
	const currentPhraseIds = phrasesData?.map((p) => p.phrase.id) ?? []

	// Add phrase mutation
	const addPhraseMutation = useMutation({
		mutationFn: async (phraseId: string) => {
			// Check if phrase already exists in playlist
			if (currentPhraseIds.includes(phraseId)) {
				throw new Error('Phrase already in playlist')
			}

			// Calculate next order value
			const maxOrder = Math.max(
				...(phrasesData?.map((p) => p.link.order || 0) ?? [0]),
				0
			)

			const { data, error } = await supabase
				.from('playlist_phrase_link')
				.insert({
					playlist_id: playlist.id,
					phrase_id: phraseId,
					order: maxOrder + 1,
					href: null,
				})
				.select()
				.single()

			if (error) throw error
			return data
		},
		onSuccess: (data) => {
			playlistPhraseLinksCollection.utils.writeInsert(data)
			toastSuccess('Phrase added to playlist')
		},
		onError: (error: Error) => {
			if (error.message === 'Phrase already in playlist') {
				toastError('Phrase is already in this playlist')
			} else {
				toastError(`Failed to add phrase: ${error.message}`)
			}
		},
	})

	// Remove phrase mutation
	const removePhraseMutation = useMutation({
		mutationFn: async (linkId: string) => {
			const { error } = await supabase
				.from('playlist_phrase_link')
				.delete()
				.eq('id', linkId)

			if (error) throw error
			return linkId
		},
		onSuccess: (linkId) => {
			playlistPhraseLinksCollection.utils.writeDelete(linkId)
			toastSuccess('Phrase removed from playlist')
		},
		onError: (error: Error) => {
			toastError(`Failed to remove phrase: ${error.message}`)
		},
	})

	// Reorder mutation - swap order values with adjacent phrase
	const reorderMutation = useMutation({
		mutationFn: async ({
			currentIndex,
			direction,
		}: {
			currentIndex: number
			direction: 'up' | 'down'
		}) => {
			if (!phrasesData) return

			const targetIndex =
				direction === 'up' ? currentIndex - 1 : currentIndex + 1
			if (targetIndex < 0 || targetIndex >= phrasesData.length) return

			const currentLink = phrasesData[currentIndex].link
			const targetLink = phrasesData[targetIndex].link

			// Swap order values
			const currentOrder = currentLink.order || currentIndex
			const targetOrder = targetLink.order || targetIndex

			// Update both links
			const { error: error1 } = await supabase
				.from('playlist_phrase_link')
				.update({ order: targetOrder })
				.eq('id', currentLink.id)

			if (error1) throw error1

			const { error: error2 } = await supabase
				.from('playlist_phrase_link')
				.update({ order: currentOrder })
				.eq('id', targetLink.id)

			if (error2) throw error2

			// Return updated data
			return {
				current: { ...currentLink, order: targetOrder },
				target: { ...targetLink, order: currentOrder },
			}
		},
		onSuccess: (data) => {
			if (!data) return
			playlistPhraseLinksCollection.utils.writeUpdate(data.current)
			playlistPhraseLinksCollection.utils.writeUpdate(data.target)
		},
		onError: (error: Error) => {
			toastError(`Failed to reorder: ${error.message}`)
		},
	})

	// Update href mutation
	const updateHrefMutation = useMutation({
		mutationFn: async ({ linkId, href }: { linkId: string; href: string }) => {
			const { data, error } = await supabase
				.from('playlist_phrase_link')
				.update({ href: href || null })
				.eq('id', linkId)
				.select()
				.single()

			if (error) throw error
			return data
		},
		onSuccess: (data) => {
			playlistPhraseLinksCollection.utils.writeUpdate(data)
		},
		onError: (error: Error) => {
			toastError(`Failed to update link: ${error.message}`)
		},
	})

	// Handle phrase selection from SelectPhrasesForComment
	const handleSelectionChange = (phraseIds: string[]) => {
		// Find newly added phrases
		const newPhraseIds = phraseIds.filter(
			(id) => !currentPhraseIds.includes(id)
		)

		// Add each new phrase
		for (const phraseId of newPhraseIds) {
			addPhraseMutation.mutate(phraseId)
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
				className="max-h-[80vh] max-w-2xl"
				data-testid="manage-phrases-dialog"
			>
				<DialogHeader>
					<DialogTitle>Manage Phrases</DialogTitle>
					<DialogDescription>
						Add, remove, or reorder phrases in "{playlist.title}"
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[50vh] pr-4">
					<div className="space-y-3">
						{phrasesData && phrasesData.length > 0 ?
							phrasesData.map((item, index) => (
								<div
									key={item.link.id}
									className="bg-muted/30 rounded border p-3"
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
												disabled={index === 0 || reorderMutation.isPending}
												onClick={() =>
													reorderMutation.mutate({
														currentIndex: index,
														direction: 'up',
													})
												}
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
												disabled={
													index === phrasesData.length - 1 ||
													reorderMutation.isPending
												}
												onClick={() =>
													reorderMutation.mutate({
														currentIndex: index,
														direction: 'down',
													})
												}
											>
												<ChevronDown className="h-4 w-4" />
											</Button>
										</div>

										{/* Phrase card */}
										<div className="min-w-0 flex-1">
											<PhraseSummaryLine item={item.phrase} />

											{/* Href input for timestamp */}
											<div className="mt-2 flex items-center gap-2">
												<LinkIcon className="text-muted-foreground ms-2 h-4 w-4 shrink-0" />
												<Input
													type="url"
													placeholder="Timestamp link (optional)"
													value={item.link.href ?? ''}
													onChange={(e) =>
														updateHrefMutation.mutate({
															linkId: item.link.id,
															href: e.target.value,
														})
													}
													className="h-8 text-sm"
												/>
											</div>
										</div>

										{/* Delete button */}
										<Button
											type="button"
											onClick={() => removePhraseMutation.mutate(item.link.id)}
											variant="ghost"
											size="icon"
											aria-label="Remove phrase"
											data-name="remove-phrase-button"
											disabled={removePhraseMutation.isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))
						:	<p className="text-muted-foreground py-8 text-center">
								No phrases in this playlist yet. Add some below!
							</p>
						}
					</div>
				</ScrollArea>

				{/* Add phrases button */}
				<div className="flex flex-row justify-between gap-2 border-t pt-4">
					<SelectPhrasesForComment
						lang={playlist.lang}
						selectedPhraseIds={currentPhraseIds}
						onSelectionChange={handleSelectionChange}
						maxPhrases={null}
						triggerText={
							phrasesData && phrasesData.length > 0 ?
								'+ Add more phrases'
							:	'Add phrases to your playlist'
						}
					/>
					<DialogClose className={buttonVariants()}>Finish</DialogClose>
				</div>
			</DialogContent>
		</Dialog>
	)
}
