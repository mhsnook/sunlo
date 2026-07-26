import { Archive, ArchiveRestore } from 'lucide-react'
import { toastSuccess, toastError } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { phrasesCollection } from '@/features/phrases/collections'

function setPhraseArchived(phraseId: uuid, archived: boolean) {
	const tx = phrasesCollection.update(phraseId, (draft) => {
		draft.archived = archived
	})
	tx.isPersisted.promise.then(
		() => toastSuccess(archived ? 'Phrase archived' : 'Phrase restored'),
		(err: unknown) => {
			toastError(
				archived ? 'Failed to archive phrase' : 'Failed to restore phrase'
			)
			console.error(err)
		}
	)
}

export function AdminArchivePhraseButton({
	phraseId,
	disabled,
}: {
	phraseId: uuid
	disabled?: boolean
}) {
	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label="Archive phrase"
			data-testid="admin-archive-button"
			onClick={() => setPhraseArchived(phraseId, true)}
			disabled={disabled}
		>
			<Archive />
		</Button>
	)
}

export function AdminUnarchivePhraseButton({
	phraseId,
	disabled,
}: {
	phraseId: uuid
	disabled?: boolean
}) {
	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label="Restore phrase"
			data-testid="admin-unarchive-button"
			onClick={() => setPhraseArchived(phraseId, false)}
			disabled={disabled}
		>
			<ArchiveRestore />
		</Button>
	)
}
