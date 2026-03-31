import { useMutation } from '@tanstack/react-query'
import { Archive, ArchiveRestore } from 'lucide-react'
import { toastSuccess, toastError } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
import { useAuth } from '@/lib/use-auth'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { phrasesCollection } from '@/features/phrases/collections'

export function AdminArchivePhraseButton({ phraseId }: { phraseId: uuid }) {
	const { isAdmin } = useAuth()

	const archiveMutation = useMutation({
		mutationFn: async () => {
			// @ts-expect-error RPC not in generated types yet — run `pnpm types` after migration
			const { error } = await supabase.rpc('admin_archive_phrase', {
				p_phrase_id: phraseId,
			})
			if (error) throw error
		},
		onSuccess: () => {
			toastSuccess('Phrase archived')
			void phrasesCollection.utils.refetch()
		},
		onError: (error) => {
			toastError('Failed to archive phrase')
			console.log('Error', error)
		},
	})

	if (!isAdmin) return null

	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label="Archive phrase"
			onClick={() => {
				if (window.confirm('Archive this phrase and all its translations?')) {
					archiveMutation.mutate()
				}
			}}
			disabled={archiveMutation.isPending}
		>
			<Archive />
		</Button>
	)
}

export function AdminUnarchivePhraseButton({ phraseId }: { phraseId: uuid }) {
	const { isAdmin } = useAuth()

	const unarchiveMutation = useMutation({
		mutationFn: async () => {
			// @ts-expect-error RPC not in generated types yet — run `pnpm types` after migration
			const { error } = await supabase.rpc('admin_unarchive_phrase', {
				p_phrase_id: phraseId,
			})
			if (error) throw error
		},
		onSuccess: () => {
			toastSuccess('Phrase restored')
			void phrasesCollection.utils.refetch()
		},
		onError: (error) => {
			toastError('Failed to restore phrase')
			console.log('Error', error)
		},
	})

	if (!isAdmin) return null

	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label="Restore phrase"
			onClick={() => unarchiveMutation.mutate()}
			disabled={unarchiveMutation.isPending}
		>
			<ArchiveRestore />
		</Button>
	)
}
