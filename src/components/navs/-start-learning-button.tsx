import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, ArrowRight } from 'lucide-react'

import languages from '@/lib/languages'
import supabase from '@/lib/supabase-client'
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaSchema } from '@/features/deck/schemas'
import { useDeckMeta } from '@/features/deck/hooks'
import { useDecks } from '@/features/deck/hooks'
import { Button, buttonVariants } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { toastError } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

export function StartLearningButton({ lang }: { lang: string }) {
	const { data: deck, isReady } = useDeckMeta(lang)
	const countDecks = useDecks().data?.length ?? 0
	const [successOpen, setSuccessOpen] = useState(false)

	const mutation = useMutation({
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
			setSuccessOpen(true)
		},
		onError: (error) => {
			toastError(`Couldn't start deck: ${error.message}`)
		},
	})

	if (!isReady || deck) return null

	return (
		<>
			<Button
				variant="soft"
				size="sm"
				onClick={() => mutation.mutate()}
				disabled={mutation.isPending}
				data-testid="start-learning-button"
			>
				{mutation.isPending ? 'Starting…' : `Learn ${languages[lang]}`}
			</Button>
			<StartLearningSuccessDialog
				open={successOpen}
				lang={lang}
				onOpenChange={setSuccessOpen}
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
