import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Archive, ArchiveRestore } from 'lucide-react'

import { decksCollection } from '@/features/deck/collections'

export function ArchiveDeckButton({
	lang,
	archived,
	className = '',
}: {
	lang: string
	archived: boolean
	className?: string
}) {
	const [open, setOpen] = useState(false)
	const navigate = useNavigate()

	const toggleArchived = () => {
		const nextArchived = !archived
		const tx = decksCollection.update(lang, (draft) => {
			draft.archived = nextArchived
		})
		setOpen(false)
		tx.isPersisted.promise.then(
			() =>
				toastSuccess(
					nextArchived
						? 'The deck has been archived and hidden from your active decks.'
						: 'The deck has been re-activated!'
				),
			(error) => {
				toastError('Failed to update deck status, please try again.')
				console.error(error)
			}
		)
		// Restoring drops you back into the deck's feed; archiving leaves you here.
		if (!nextArchived) {
			void navigate({ to: '/learn/$lang/feed', params: { lang } })
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild className={className}>
				{archived ? (
					<Button
						variant="soft"
						size="sm"
						disabled={!archived}
						data-testid="restore-deck-button"
					>
						<ArchiveRestore className="text-con-mid text-chroma-max h-4 w-4" />
						Restore deck
					</Button>
				) : (
					<Button
						variant="soft"
						hue="danger"
						size="sm"
						disabled={!!archived}
						data-testid="archive-deck-button"
					>
						<Archive className="h-4 w-4" />
						Archive deck
					</Button>
				)}
			</AlertDialogTrigger>
			<AlertDialogContent
				data-testid={
					archived
						? 'restore-confirmation-dialog'
						: 'archive-confirmation-dialog'
				}
			>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{archived
							? 'Restore this deck?'
							: 'Are you sure you want to archive this deck?'}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{archived
							? `You can pick up right where you left off.`
							: `This action will hide the deck from your active decks. You can unarchive it later if needed.`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel className="btn btn-size-default btn-variant-neutral">
						Cancel
					</AlertDialogCancel>
					{archived ? (
						<AlertDialogAction
							onClick={toggleArchived}
							data-testid="confirm-restore-button"
						>
							Restore
						</AlertDialogAction>
					) : (
						<AlertDialogAction
							className="btn btn-size-default btn-variant-default hue-danger"
							onClick={toggleArchived}
							data-testid="confirm-archive-button"
						>
							Archive
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
