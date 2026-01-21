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
import { useUserId } from '@/lib/use-auth'

import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Archive, ArchiveRestore } from 'lucide-react'

import { decksCollection } from '@/lib/collections'
import { DeckMetaRawSchema } from '@/lib/schemas'

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
	const userId = useUserId()
	const mutation = useMutation({
		mutationFn: async () => {
			const { data } = await supabase
				.from('user_deck')
				.update({ archived: !archived })
				.eq('lang', lang)
				.eq('uid', userId!)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			setOpen(false)
			if (!data) return null
			decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))

			toastSuccess(
				!data.archived ?
					'The deck has been re-activated!'
				:	'The deck has been archived and hidden from your active decks.'
			)
		},
		onError: (error) => {
			if (error) {
				toastError(
					`Failed to update deck status, we'll just try refreshing the page...`
				)
				console.log(error)
			}
			setTimeout(() => {
				window.location.reload()
			}, 1500)
		},
	})

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild className={className}>
				{archived ?
					<Button variant="outline-primary" disabled={!archived}>
						<ArchiveRestore className="text-primary h-4 w-4" />
						Restore deck
					</Button>
				:	<Button variant="destructive-outline" disabled={!!archived}>
						<Archive className="h-4 w-4" />
						Archive deck
					</Button>
				}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{archived ?
							'Restore this deck?'
						:	'Are you sure you want to archive this deck?'}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{archived ?
							`You can pick up right where you left off.`
						:	`This action will hide the deck from your active decks. You can unarchive it later if needed.`
						}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						className={buttonVariants({ variant: 'secondary' })}
					>
						Cancel
					</AlertDialogCancel>
					{archived ?
						<AlertDialogAction onClick={() => mutation.mutate()}>
							Restore
						</AlertDialogAction>
					:	<AlertDialogAction
							className={buttonVariants({ variant: 'destructive' })}
							onClick={() => mutation.mutate()}
						>
							Archive
						</AlertDialogAction>
					}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
