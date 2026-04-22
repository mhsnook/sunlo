import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CircleCheck, Logs, Rocket } from 'lucide-react'

import { Card } from '@/components/ui/card'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { getThemeCss } from '@/lib/deck-themes'
import { DeckMetaType } from '@/features/deck/schemas'
import { useDeckPids } from '@/features/deck/hooks'
import { useActiveReviewRemaining } from '@/features/review/hooks'
import { todayString } from '@/lib/utils'

export function DeckTile({ deck }: { deck: DeckMetaType }) {
	const [open, setOpen] = useState(false)
	const { data: pids } = useDeckPids(deck.lang)
	const remaining = useActiveReviewRemaining(deck.lang, todayString())

	const totalCards = pids?.all.length ?? 0
	const dueToday =
		remaining !== null ? remaining : (pids?.today_active.length ?? 0)
	const tileCode = deck.lang.slice(0, 3).toUpperCase()
	const style = getThemeCss(deck.theme)

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				data-testid="deck-tile"
				data-key={deck.lang}
				className="block w-full cursor-pointer text-start transition-all duration-200 hover:-translate-y-0.5"
				style={style}
			>
				<Card
					className="flex h-full flex-col gap-3 p-4 hover:shadow"
					data-testid={`deck-tile-${deck.lang}`}
				>
					<span className="from-5-mhi-primary to-6-mid-primary text-primary-foreground inline-flex w-fit items-center justify-center rounded-md bg-gradient-to-br px-2.5 py-1 font-mono text-sm font-semibold tracking-wider uppercase shadow-xs">
						{tileCode}
					</span>

					<div className="space-y-0.5">
						<h3 className="text-lg leading-tight font-semibold">
							{deck.language}
						</h3>
						<p className="text-muted-foreground text-xs">
							{totalCards === 0 ? (
								'no cards yet'
							) : (
								<>
									{totalCards} {totalCards === 1 ? 'card' : 'cards'}
									{dueToday > 0 ? (
										<>
											{' · '}
											<span className="text-primary-foresoft font-medium">
												{dueToday} due
											</span>
										</>
									) : (
										<span className="text-muted-foreground"> · new</span>
									)}
								</>
							)}
						</p>
					</div>
				</Card>
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					style={style}
					data-testid="deck-tile-dialog"
					data-key={deck.lang}
					className="max-w-md"
				>
					<DialogHeader>
						<DialogTitle>{deck.language}</DialogTitle>
						<DialogDescription>
							{totalCards === 0 ? (
								'This deck is empty — time to start adding phrases.'
							) : dueToday > 0 ? (
								<>
									<span className="text-primary-foresoft font-medium">
										{dueToday} {dueToday === 1 ? 'card' : 'cards'} due
									</span>
									{' · '}
									{totalCards} total
								</>
							) : (
								<>All caught up! {totalCards} total cards.</>
							)}
						</DialogDescription>
					</DialogHeader>

					<div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
						<DialogClose asChild>
							<Link
								to="/learn/$lang/review"
								params={{ lang: deck.lang }}
								data-testid="start-practice-link"
								className="from-5-mhi-primary to-6-mid-primary text-primary-foreground hover:from-lc-up-1 flex h-full flex-col items-start gap-2 rounded-2xl bg-gradient-to-br p-4 shadow transition-transform hover:-translate-y-0.5"
							>
								{dueToday === 0 ? (
									<CircleCheck className="size-6" />
								) : (
									<Rocket className="size-6" />
								)}
								<div>
									<div className="text-base leading-tight font-semibold">
										Daily practice
									</div>
									<div className="text-primary-foreground/80 text-xs">
										{dueToday > 0
											? `${dueToday} ${dueToday === 1 ? 'card' : 'cards'} ready`
											: 'Already finished for today'}
									</div>
								</div>
							</Link>
						</DialogClose>

						<DialogClose asChild>
							<Link
								to="/learn/$lang"
								params={{ lang: deck.lang }}
								data-testid="deck-link"
								className="border-2-lo-primary bg-1-mlo-primary text-primary-foresoft hover:bg-lc-down-1 hover:text-lc-up-1 flex h-full flex-col items-start gap-2 rounded-2xl border p-4 shadow transition-transform hover:-translate-y-0.5"
							>
								<Logs className="size-6" />
								<div>
									<div className="text-base leading-tight font-semibold">
										Browse deck
									</div>
									<div className="text-muted-foreground text-xs">
										Feed, phrases, stats & settings
									</div>
								</div>
							</Link>
						</DialogClose>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}

export function AddDeckTile() {
	return (
		<Link
			to="/learn/add-deck"
			data-testid="add-deck-tile"
			className="block h-full transition-all duration-200 hover:-translate-y-0.5"
		>
			<Card className="border-3-lo-primary text-muted-foreground hover:text-primary-foresoft hover:border-primary-foresoft flex h-full min-h-[6.5rem] flex-col items-center justify-center gap-1 border-2 border-dashed bg-transparent p-4 shadow-none hover:bg-transparent hover:shadow-none">
				<span className="text-2xl leading-none">+</span>
				<span className="text-xs font-medium">Start a new deck</span>
			</Card>
		</Link>
	)
}
