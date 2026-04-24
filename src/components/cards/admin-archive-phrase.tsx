import { useMutation } from '@tanstack/react-query'
import { Archive, ArchiveRestore } from 'lucide-react'
import { toastSuccess, toastError } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { phrasesCollection } from '@/features/phrases/collections'

export function AdminArchivePhraseButton({
	phraseId,
	disabled,
}: {
	phraseId: uuid
	disabled?: boolean
}) {
	const archiveMutation = useMutation({
		mutationFn: async () => {
			await supabase
				.from('phrase')
				.update({ archived: true })
				.eq('id', phraseId)
				.throwOnError()
		},
		onSuccess: () => {
			phrasesCollection.utils.writeUpdate({ id: phraseId, archived: true })
			toastSuccess('Phrase archived')
		},
		onError: (error) => {
			toastError('Failed to archive phrase')
			console.error(error)
		},
	})

	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label="Archive phrase"
			data-testid="admin-archive-button"
			onClick={() => archiveMutation.mutate()}
			disabled={disabled || archiveMutation.isPending}
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
	const unarchiveMutation = useMutation({
		mutationFn: async () => {
			await supabase
				.from('phrase')
				.update({ archived: false })
				.eq('id', phraseId)
				.throwOnError()
		},
		onSuccess: () => {
			phrasesCollection.utils.writeUpdate({ id: phraseId, archived: false })
			toastSuccess('Phrase restored')
		},
		onError: (error) => {
			toastError('Failed to restore phrase')
			console.error(error)
		},
	})

	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label="Restore phrase"
			data-testid="admin-unarchive-button"
			onClick={() => unarchiveMutation.mutate()}
			disabled={disabled || unarchiveMutation.isPending}
		>
			<ArchiveRestore />
		</Button>
	)
}
