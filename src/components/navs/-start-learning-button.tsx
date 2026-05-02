import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, ArrowRight, ArchiveRestore, Archive } from 'lucide-react'

import languages from '@/lib/languages'
import supabase from '@/lib/supabase-client'
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaSchema, DeckMetaRawSchema } from '@/features/deck/schemas'
import { useDeckMeta } from '@/features/deck/hooks'
import { useDecks } from '@/features/deck/hooks'
import { useAuth, useUserId } from '@/lib/use-auth'
import { Button, buttonVariants } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

export function StartLearningButton({ lang }: { lang: string }) {
	const { isAuth } = useAuth()
	const { data: deck, isReady } = useDeckMeta(lang)
	const countDecks = useDecks().data?.length ?? 0
	const userId = useUserId()
	const [startOpen, setStartOpen] = useState(false)
	const [unarchiveOpen, setUnarchiveOpen] = useState(false)

	if (!isAuth)
		return (
			<Link
				to="/signup"
				className={cn(buttonVariants({ variant: 'soft', size: 'sm' }))}
				data-testid="join-to-learn-link"
			>
				Join
			</Link>
		)

	const startMutation = useMutation({
		mutationKey: ['new-deck', lang],
		mutationFn: async () => {
			const { data, error } = await supabase
				.from('user_deck')
				.insert({ lang })
				.select()
			if (error) throw error
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeInsert(
				DeckMetaSchema.parse({
					...data,
					language: languages[data.lang],
					theme: countDecks % 5,
				})
			)
			setStartOpen(true)
		},
		onError: (error) => {
			toastError(`Couldn't start deck: ${error.message}`)
		},
	})

	const unarchiveMutation = useMutation({
		mutationKey: ['unarchive-deck', lang],
		mutationFn: async () => {
			const { data } = await supabase
				.from('user_deck')
				.update({ archived: false })
				.eq('lang', lang)
				.eq('uid', userId!)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			setUnarchiveOpen(false)
			if (!data) return
			decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))
			toastSuccess(`${languages[lang]} deck restored!`)
		},
		onError: (error) => {
			toastError('Failed to restore the deck.')
			console.log(error)
		},
	})

	if (!isReady) return null
	if (deck && !deck.archived) return null

	if (deck?.archived) {
		return (
			<>
				<Button
					variant="soft"
					size="sm"
					onClick={() => setUnarchiveOpen(true)}
					data-testid="continue-learning-button"
				>
					Continue Learning
				</Button>
				<Dialog open={unarchiveOpen} onOpenChange={setUnarchiveOpen}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Un-archive your {languages[lang]} deck?</DialogTitle>
							<DialogDescription>
								Your progress is preserved — pick up where you left off.
							</DialogDescription>
						</DialogHeader>
						<div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
							<button
								type="button"
								onClick={() => unarchiveMutation.mutate()}
								disabled={unarchiveMutation.isPending}
								data-testid="confirm-unarchive-button"
								className="from-5-mhi-primary to-6-mid-primary text-primary-foreground hover:from-lc-up-1 flex h-full cursor-pointer flex-col items-start gap-2 rounded-2xl bg-gradient-to-br p-4 text-start shadow transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
							>
								<ArchiveRestore className="size-6" />
								<div>
									<div className="text-base leading-tight font-semibold">
										{unarchiveMutation.isPending
											? 'Restoring…'
											: 'Yes, restore'}
									</div>
									<div className="text-primary-foreground/80 text-xs">
										Move back to your active decks
									</div>
								</div>
							</button>
							<DialogClose
								data-testid="cancel-unarchive-button"
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

	return (
		<>
			<Button
				variant="soft"
				size="sm"
				onClick={() => startMutation.mutate()}
				disabled={startMutation.isPending}
				data-testid="start-learning-button"
			>
				{startMutation.isPending ? 'Starting…' : `Learn ${languages[lang]}`}
			</Button>
			<StartLearningSuccessDialog
				open={startOpen}
				lang={lang}
				onOpenChange={setStartOpen}
			/>
		</>
	)
}

function StartLearningSuccessDialog({
	open,
	lang,
	onOpenChange,
}: {
	open: boolean
	lang: string
	onOpenChange: (open: boolean) => void
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="text-center">
				<div className="from-2-mlo-primary to-0-lo-primary mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br">
					<Sparkles className="text-primary size-10" />
				</div>
				<DialogHeader className="border-none pb-0 text-center">
					<DialogTitle className="text-2xl">
						You&apos;re learning {languages[lang]}!
					</DialogTitle>
					<DialogDescription className="text-base">
						Your deck is ready. Start adding interesting cards as you come
						across them — and we strongly recommend doing your first practice
						session right now while you have the momentum.{' '}
						<strong>It only takes 5 minutes.</strong>
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3 pt-2">
					<Link
						to="/learn/$lang/review"
						params={{ lang }}
						onClick={() => onOpenChange(false)}
						className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
						data-testid="go-to-first-review-link"
					>
						Do My First Review
						<ArrowRight className="size-4" />
					</Link>
					<Button
						variant="neutral"
						size="lg"
						onClick={() => onOpenChange(false)}
						data-testid="dismiss-start-learning-dialog"
					>
						Keep Browsing
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
