import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Archive, ArchiveRestore } from 'lucide-react'

import { Card } from '@/components/ui/card'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaRawSchema, type DeckMetaType } from '@/features/deck/schemas'
import { useDeckPids } from '@/features/deck/hooks'
import { ago } from '@/lib/dayjs'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'

export function ArchivedDeckTile({ deck }: { deck: DeckMetaType }) {
	const [open, setOpen] = useState(false)
	const userId = useUserId()
	const { data: pids } = useDeckPids(deck.lang)

	const totalCards = pids?.all.length ?? 0
	const lastReviewed = ago(deck.most_recent_review_at)
	const tileCode = deck.lang.slice(0, 3).toUpperCase()

	const mutation = useMutation({
		mutationFn: async () => {
			const { data } = await supabase
				.from('user_deck')
				.update({ archived: false })
				.eq('lang', deck.lang)
				.eq('uid', userId!)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			setOpen(false)
			if (!data) return
			decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))
			toastSuccess('The deck has been re-activated!')
		},
		onError: (error) => {
			toastError('Failed to restore the deck. Refreshing the page…')
			console.log(error)
			setTimeout(() => window.location.reload(), 1500)
		},
	})

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				data-testid="archived-deck-tile"
				data-key={deck.lang}
				className="block w-full cursor-pointer text-start transition-all duration-200 hover:-translate-y-0.5"
			>
				<Card
					className="flex h-full flex-col gap-3 p-4 opacity-80 hover:opacity-100 hover:shadow"
					data-testid={`archived-deck-tile-${deck.lang}`}
				>
					<span className="bg-1-mlo-neutral text-6-mid-neutral border-2-lo-neutral inline-flex w-fit items-center justify-center rounded-md border px-2.5 py-1 font-mono text-sm font-semibold tracking-wider uppercase">
						{tileCode}
					</span>

					<div className="space-y-0.5">
						<h3 className="text-muted-foreground text-lg leading-tight font-semibold">
							{deck.language}
						</h3>
						<p className="text-muted-foreground text-xs">
							{totalCards === 0
								? 'no cards'
								: `${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
							{lastReviewed ? (
								<>
									<span> · </span>
									<span>last reviewed {lastReviewed}</span>
								</>
							) : (
								<>
									<span> · </span>
									<span>never reviewed</span>
								</>
							)}
						</p>
					</div>
				</Card>
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					data-testid="restore-deck-dialog"
					data-key={deck.lang}
					className="max-w-md"
				>
					<DialogHeader>
						<DialogTitle>Restore {deck.language}?</DialogTitle>
						<DialogDescription>
							Your progress is preserved — pick up where you left off.
						</DialogDescription>
					</DialogHeader>

					<div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
						<button
							type="button"
							onClick={() => mutation.mutate()}
							disabled={mutation.isPending}
							data-testid="confirm-restore-button"
							className="from-5-mhi-primary to-6-mid-primary text-primary-foreground hover:from-lc-up-1 flex h-full cursor-pointer flex-col items-start gap-2 rounded-2xl bg-gradient-to-br p-4 text-start shadow transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
						>
							<ArchiveRestore className="size-6" />
							<div>
								<div className="text-base leading-tight font-semibold">
									{mutation.isPending ? 'Restoring…' : 'Yes, restore'}
								</div>
								<div className="text-primary-foreground/80 text-xs">
									Move back to your active decks
								</div>
							</div>
						</button>

						<DialogClose
							data-testid="cancel-restore-button"
							className="border-2-lo-neutral bg-1-mlo-neutral text-7-mid-neutral hover:bg-lc-down-1 hover:text-lc-up-1 flex h-full cursor-pointer flex-col items-start gap-2 rounded-2xl border p-4 text-start shadow transition-transform hover:-translate-y-0.5"
						>
							<Archive className="size-6" />
							<div>
								<div className="text-base leading-tight font-semibold">
									No, keep archived
								</div>
								<div className="text-muted-foreground text-xs">
									Leave it where it is
								</div>
							</div>
						</DialogClose>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
