import { type CSSProperties, useState } from 'react'
import { toastError, toastNeutral, toastSuccess } from '@/components/ui/sonner'
import { useMutation } from '@tanstack/react-query'
import { BookmarkCheck, BookmarkX, MoreVertical, Play } from 'lucide-react'

import { CardContent, CardFooter } from '@/components/ui/card'
import { cn, preventDefaultCallback } from '@/lib/utils'
import { formatInterval } from '@/lib/dayjs'
import { intervals } from '@/lib/fsrs'
import PermalinkButton from '@/components/permalink-button'
import PhraseExtraInfo from '@/components/phrase-extra-info'
import Flagged from '@/components/flagged'
import { Button } from '@/components/ui/button'
import {
	useLatestReviewForPhrase,
	useOneReviewToday,
	useReviewMutation,
} from '@/hooks/use-reviews'
import { Separator } from '@/components/ui/separator'
import { LangBadge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SendPhraseToFriendButton } from '@/components/card-pieces/send-phrase-to-friend'
import {
	CardMetaSchema,
	PhraseFullFilteredType,
	TranslationType,
} from '@/lib/schemas'
import { uuid } from '@/types/main'
import { usePhrase } from '@/hooks/composite-phrase'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { cardsCollection } from '@/lib/collections'

const playAudio = (text: string) => {
	toastNeutral(`Playing audio for: ${text}`)
	// In a real application, you would trigger audio playback here
}

export function ReviewSingleCard({
	pid,
	reviewStage,
	dayString,
}: {
	pid: uuid
	reviewStage: number
	dayString: string
}) {
	const { data: phrase, status } = usePhrase(pid)
	if (status === 'not-found')
		throw new Error(`Trying to review this card, but can't find it`)
	const [revealCard, setRevealCard] = useState(false)
	const { data: prevData } = useOneReviewToday(dayString, pid)
	const { data: latestReview } = useLatestReviewForPhrase(pid)
	const closeCard = () => setRevealCard(false)
	const { mutate, isPending } = useReviewMutation(
		pid,
		dayString,
		closeCard,
		reviewStage,
		prevData,
		latestReview
	)

	const nextIntervals = intervals(latestReview).map(formatInterval)

	if (!phrase) return null

	const showAnswers = prevData && reviewStage === 1 ? true : revealCard
	const isReverse = phrase.only_reverse === true

	// Phrase display - consistent styling with quotes like big-phrase-card
	const phraseDisplay = (
		<div className="flex items-center justify-center gap-2">
			<div className="text-center text-2xl font-bold">
				&ldquo;{phrase.text}&rdquo;
			</div>
			<Flagged name="text_to_speech">
				<Button
					size="icon"
					variant="secondary"
					onClick={() => playAudio(phrase.text)}
					aria-label="Play phrase"
				>
					<Play className="size-4" />
				</Button>
			</Flagged>
		</div>
	)

	// Translations display - consistent styling with header like big-phrase-card
	const translationsDisplay = (
		<div className="w-full space-y-3">
			<h3 className="text-muted-foreground text-center text-sm font-medium tracking-wide uppercase">
				Translations
			</h3>
			{phrase.translations?.map((trans: TranslationType) => (
				<div key={trans.id} className="flex items-center justify-center gap-2">
					<LangBadge lang={trans.lang} />
					<div className="text-lg">{trans.text}</div>
					<Flagged name="text_to_speech">
						<Button
							size="icon"
							variant="secondary"
							onClick={() => playAudio(trans.text)}
							aria-label="Play translation"
						>
							<Play className="size-4" />
						</Button>
					</Flagged>
				</div>
			))}
		</div>
	)

	// Forward: show phrase first, reveal translations
	// Reverse: show translations first, reveal phrase
	const questionContent = isReverse ? translationsDisplay : phraseDisplay
	const answerContent = isReverse ? phraseDisplay : translationsDisplay

	return (
		<CardlikeFlashcard
			className="mx-auto flex min-h-[80vh] w-full flex-col"
			style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
			data-name="flashcard"
			data-key={pid}
		>
			<CardContent className="relative flex grow flex-col items-center justify-center gap-4 pt-0">
				<ContextMenu phrase={phrase} />
				{questionContent}
				<Separator />
				<div
					className={`w-full transition-opacity ${showAnswers ? 'opacity-100' : 'opacity-0'}`}
				>
					{answerContent}
				</div>
			</CardContent>
			<CardFooter className="flex flex-col">
				{!showAnswers ?
					<Button
						data-testid="reveal-answer-button"
						className="mb-3 w-full"
						onClick={() => setRevealCard(true)}
					>
						{isReverse ? 'Show Phrase' : 'Show Translations'}
					</Button>
				:	<div
						data-name="answer-buttons-row"
						className="mb-3 grid w-full max-w-160 grid-cols-4"
					>
						<Button
							variant="default"
							data-testid="rating-again-button"
							onClick={() => mutate({ score: 1 })}
							disabled={isPending}
							className={cn(
								'rounded-none rounded-l-2xl border-red-600! bg-red-600! hover:border-white! hover:bg-red-700!',
								prevData?.score === 1 && reviewStage < 4 ?
									'ring-primary ring-2 ring-offset-3'
								:	''
							)}
						>
							Again ({nextIntervals[0]})
						</Button>
						<Button
							variant="default"
							data-testid="rating-hard-button"
							onClick={() => mutate({ score: 2 })}
							disabled={isPending}
							className={cn(
								'rounded-none border-gray-200! bg-gray-200! text-gray-700! hover:border-white! hover:bg-gray-300!',
								prevData?.score === 2 ? 'ring-primary ring-2 ring-offset-3' : ''
							)}
						>
							Hard ({nextIntervals[1]})
						</Button>
						<Button
							variant="default"
							data-testid="rating-good-button"
							onClick={() => mutate({ score: 3 })}
							disabled={isPending}
							className={cn(
								'rounded-none border-green-500! bg-green-500! hover:border-white! hover:bg-green-600!',
								prevData?.score === 3 ? 'ring-primary ring-2 ring-offset-3' : ''
							)}
						>
							Good ({nextIntervals[2]})
						</Button>
						<Button
							variant="default"
							data-testid="rating-easy-button"
							className={cn(
								'rounded-none rounded-r-2xl border-blue-500 bg-blue-500! hover:border-white! hover:bg-blue-600',
								prevData?.score === 4 ? 'ring-primary ring-2 ring-offset-3' : ''
							)}
							onClick={() => mutate({ score: 4 })}
							disabled={isPending}
						>
							Easy ({nextIntervals[3]})
						</Button>
					</div>
				}
			</CardFooter>
		</CardlikeFlashcard>
	)
}

function ContextMenu({ phrase }: { phrase: PhraseFullFilteredType }) {
	const [isOpen, setIsOpen] = useState(false)
	const userId = useUserId()

	const cardStatusMutation = useMutation({
		mutationKey: ['update-card-status', phrase.id],
		mutationFn: async (status: 'learned' | 'skipped') => {
			if (!userId) throw new Error('You must be logged in')
			const { data } = await supabase
				.from('user_card')
				.update({ status })
				.eq('phrase_id', phrase.id)
				.eq('uid', userId)
				.select()
				.throwOnError()
			return data?.[0]
		},
		onSuccess: (data) => {
			if (data) {
				cardsCollection.utils.writeUpdate(CardMetaSchema.parse(data))
				const message =
					data.status === 'learned' ?
						"Great! This card is now marked as learned and won't appear in your reviews."
					:	"This card has been skipped and won't appear in your reviews."
				toastSuccess(message)
			}
			setIsOpen(false)
		},
		onError: (error) => {
			toastError('Failed to update card status')
			console.log('Error updating card status', error)
		},
	})

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					title="Open context menu"
					className="absolute top-4 right-4"
				>
					<MoreVertical />
					<span className="sr-only">Open context menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem
					onClick={() => cardStatusMutation.mutate('learned')}
					disabled={cardStatusMutation.isPending}
				>
					<BookmarkCheck className="mr-2 h-4 w-4 text-green-600" />
					I've learned this
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => cardStatusMutation.mutate('skipped')}
					disabled={cardStatusMutation.isPending}
				>
					<BookmarkX className="mr-2 h-4 w-4" />
					Skip this card
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={preventDefaultCallback} className="p-0">
					<PermalinkButton
						to={'/learn/$lang/phrases/$id'}
						params={{ lang: phrase.lang, id: phrase.id }}
						className="w-full px-2 py-1.5"
						link
					/>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={preventDefaultCallback} className="p-0">
					<SendPhraseToFriendButton
						phrase={phrase}
						link
						className="w-full px-2 py-1.5"
					/>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={preventDefaultCallback} className="p-0">
					<PhraseExtraInfo
						phrase={phrase}
						link
						className="w-full px-2 py-1.5"
					/>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
