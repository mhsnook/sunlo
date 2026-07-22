import { useState } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'

import { LangBadge } from '@/components/ui/badge'
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
import { type DeckMetaType } from '@/features/deck/schemas'
import { useDeckPids, useDeckCardStats } from '@/features/deck/hooks'
import { ago } from '@/lib/dayjs'

export function ArchivedDeckTile({ deck }: { deck: DeckMetaType }) {
	const [open, setOpen] = useState(false)
	const { data: pids } = useDeckPids(deck.lang)
	const { most_recent_review_at } = useDeckCardStats(deck.lang)

	const totalCards = pids?.all.length ?? 0
	const lastReviewed = ago(most_recent_review_at)

	const restoreDeck = () => {
		const tx = decksCollection.update(deck.lang, (draft) => {
			draft.archived = false
		})
		tx.isPersisted.promise.then(
			() => toastSuccess('The deck has been re-activated!'),
			(error) => {
				console.log(error)
				toastError('Failed to restore the deck')
			}
		)
		setOpen(false)
	}

	return (
		<>
			<div data-key={deck.lang}>
				<button
					type="button"
					onClick={() => setOpen(true)}
					data-testid="archived-deck-tile"
					className="block w-full cursor-pointer text-start transition-all duration-200 hover:-translate-y-0.5"
				>
					<Card
						className="flex h-full flex-col gap-3 p-4 opacity-80 hover:opacity-100 hover:shadow"
						data-testid={`archived-deck-tile-${deck.lang}`}
					>
						<LangBadge lang={deck.lang} />

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
			</div>

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
							onClick={restoreDeck}
							data-testid="confirm-restore-button"
							className="from-lc-5 from-chroma-mhi from-hue-primary to-lc-6 to-chroma-mid to-hue-primary text-primary-foreground hover:from-lc-up-1 flex h-full cursor-pointer flex-col items-start gap-2 rounded-2xl bg-gradient-to-br p-4 text-start shadow transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
						>
							<ArchiveRestore className="size-6" />
							<div>
								<div className="text-base leading-tight font-semibold">
									Yes, restore
								</div>
								<div className="text-primary-foreground/80 text-xs">
									Move back to your active decks
								</div>
							</div>
						</button>

						<DialogClose
							data-testid="cancel-restore-button"
							className="border-lc-2 border-chroma-lo border-hue-neutral bg-lc-1 bg-chroma-mlo bg-hue-neutral text-lc-7 text-chroma-mid text-hue-neutral hover:bg-lc-down-1 hover:text-lc-up-1 flex h-full cursor-pointer flex-col items-start gap-2 rounded-2xl border p-4 text-start shadow transition-transform hover:-translate-y-0.5"
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
