import { type CSSProperties } from 'react'
import { Eye, Headphones, Library, Sparkles } from 'lucide-react'
import { Link, useParams } from '@tanstack/react-router'

import { Button, buttonVariants } from '@/components/ui/button'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { CardContent } from '@/components/ui/card'
import { LangBadge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { usePhrase } from '@/hooks/composite-phrase'
import { useReviewActions, useNewCardPids } from '@/hooks/use-review-store'
import type { pids, uuid } from '@/types/main'
import type { TranslationType } from '@/lib/schemas'

function PreviewCard({ pid }: { pid: uuid }) {
	const { data: phrase, status } = usePhrase(pid)

	if (status === 'not-found' || !phrase) return null

	const isReverse = phrase.only_reverse === true

	const phraseDisplay = (
		<div className="text-center text-xl font-bold">
			&ldquo;{phrase.text}&rdquo;
		</div>
	)

	const translationsDisplay = (
		<div className="w-full space-y-2">
			{phrase.translations?.map((trans: TranslationType) => (
				<div key={trans.id} className="flex items-center justify-center gap-2">
					<LangBadge lang={trans.lang} />
					<div className="text-base">{trans.text}</div>
				</div>
			))}
		</div>
	)

	return (
		<CardlikeFlashcard
			className="flex w-full max-w-lg flex-col"
			style={{ viewTransitionName: `preview-${pid}` } as CSSProperties}
		>
			<CardContent className="flex flex-col items-center justify-center gap-3 p-4">
				{isReverse ?
					<>
						{translationsDisplay}
						<Separator />
						{phraseDisplay}
					</>
				:	<>
						{phraseDisplay}
						<Separator />
						{translationsDisplay}
					</>
				}
			</CardContent>
		</CardlikeFlashcard>
	)
}

export function NewCardsPreview({ manifest }: { manifest: pids }) {
	const { lang } = useParams({ strict: false })
	const newCardPids = useNewCardPids()
	const { startReview } = useReviewActions()

	// Filter manifest to only show new cards in the order they appear in manifest
	const newCardsInOrder = manifest.filter(
		(pid) => newCardPids?.includes(pid)
	)

	if (newCardsInOrder.length === 0) {
		// No new cards to preview - show helpful guidance
		return (
			<div className="mx-auto flex max-w-lg flex-col gap-6 py-8">
				<div className="text-center">
					<h2 className="mb-2 text-xl font-semibold">
						No new cards in today's review
					</h2>
					<p className="text-muted-foreground">
						You've got {manifest.length} scheduled review
						{manifest.length === 1 ? '' : 's'} ready to go, but no fresh cards
						to learn today.
					</p>
				</div>

				<div className="bg-muted/50 space-y-3 rounded-lg p-4">
					<p className="text-sm font-medium">
						Keep your momentum going with new cards:
					</p>
					<div className="flex flex-col gap-2">
						<Link
							to="/learn/$lang/playlists"
							params={{ lang: lang! }}
							className={buttonVariants({
								variant: 'outline',
								className: 'justify-start',
							})}
						>
							<Library className="size-4" />
							Browse playlists for curated phrases
						</Link>
						<Link
							to="/learn/$lang/feed"
							params={{ lang: lang! }}
							className={buttonVariants({
								variant: 'outline',
								className: 'justify-start',
							})}
						>
							<Sparkles className="size-4" />
							Check the feed for new content
						</Link>
						<Link
							to="/learn/$lang/phrases/new"
							params={{ lang: lang! }}
							className={buttonVariants({
								variant: 'outline',
								className: 'justify-start',
							})}
						>
							<Headphones className="size-4" />
							Add phrases from a podcast or video
						</Link>
					</div>
				</div>

				<div className="text-muted-foreground text-center text-sm">
					<p>
						Or just proceed with your {manifest.length} scheduled card
						{manifest.length === 1 ? '' : 's'} - either way is fine!
					</p>
				</div>

				<div className="flex justify-center">
					<Button onClick={startReview} size="lg" className="min-w-48">
						Start Review
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex flex-col items-center gap-2 py-4 text-center">
				<div className="bg-foreground/80 text-background flex items-center gap-2 rounded-full px-4 py-2">
					<Eye className="size-5" />
					<span className="font-medium">Preview New Cards</span>
				</div>
				<p className="text-muted-foreground max-w-md text-sm">
					Scroll through your {newCardsInOrder.length} new card
					{newCardsInOrder.length === 1 ? '' : 's'} before starting. Take a
					moment to familiarize yourself with them!
				</p>
			</div>

			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-2 pb-4">
				{newCardsInOrder.map((pid) => (
					<PreviewCard key={pid} pid={pid} />
				))}
			</div>

			<div className="bg-muted mt-auto flex justify-center border-t p-4">
				<Button onClick={startReview} size="lg" className="min-w-48">
					Start Review
				</Button>
			</div>
		</div>
	)
}
