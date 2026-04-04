import { type CSSProperties, useEffect, useState } from 'react'
import { toastError, toastNeutral, toastSuccess } from '@/components/ui/sonner'
import { playReviewSound } from '@/lib/review-sounds'
import { useMutation } from '@tanstack/react-query'
import {
	BookmarkCheck,
	BookmarkX,
	MoreVertical,
	Play,
	Send,
} from 'lucide-react'

import { CardContent, CardFooter } from '@/components/ui/card'
import { cn, preventDefaultCallback } from '@/lib/utils'
import { formatInterval } from '@/lib/dayjs'
import { intervals } from '@/features/review/fsrs'
import PermalinkButton from '@/components/permalink-button'
import PhraseExtraInfo from '@/components/phrase-extra-info'
import Flagged from '@/components/flagged'
import { Button } from '@/components/ui/button'
import {
	useLatestReviewForPhrase,
	useOneReviewToday,
	useReviewMutation,
} from '@/features/review/hooks'
import { useReviewAnswerMode } from '@/features/deck/hooks'
import { useReviewLang } from '@/features/review/store'
import { Separator } from '@/components/ui/separator'
import { LangBadge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SendPhraseToFriendDialog } from '@/components/card-pieces/send-phrase-to-friend'
import {
	PhraseFullFilteredType,
	TranslationType,
} from '@/features/phrases/schemas'
import { CardMetaSchema } from '@/features/deck/schemas'
import { uuid } from '@/types/main'
import { usePhrase } from '@/hooks/composite-phrase'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { cardsCollection } from '@/features/deck/collections'

const playAudio = (text: string) => {
	toastNeutral(`Playing audio for: ${text}`)
	// In a real application, you would trigger audio playback here
}

const COIN_COLORS: Record<1 | 2 | 3 | 4, string> = {
	1: 'bg-red-600',
	2: 'bg-gray-400',
	3: 'bg-green-500',
	4: 'bg-blue-500',
}

function ScoreCoin({
	score,
	onDone,
}: {
	score: 1 | 2 | 3 | 4
	onDone: () => void
}) {
	useEffect(() => {
		const t = setTimeout(onDone, 700)
		return () => clearTimeout(t)
	}, [onDone])

	return (
		<div
			className={cn(
				'animate-score-coin pointer-events-none absolute bottom-full left-1/2 size-5 rounded-full shadow-md',
				COIN_COLORS[score]
			)}
		/>
	)
}

export function ReviewSingleCard({
	pid,
	reviewStage,
	dayString,
	triggerSlide,
}: {
	pid: uuid
	reviewStage: number
	dayString: string
	triggerSlide: (navigate: () => void) => void
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
		latestReview,
		triggerSlide
	)

	const lang = useReviewLang()
	const answerMode = useReviewAnswerMode(lang)
	const nextIntervals = intervals(latestReview).map(formatInterval)

	const [coin, setCoin] = useState<{ score: 1 | 2 | 3 | 4; id: number } | null>(null)

	const submitScore = (score: 1 | 2 | 3 | 4) => {
		playReviewSound(score)
		setCoin({ score, id: Date.now() })
		mutate({ score })
	}

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
					variant="neutral"
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
			{phrase.translations_mine?.map((trans: TranslationType) => (
				<div key={trans.id} className="flex items-center justify-center gap-2">
					<LangBadge lang={trans.lang} />
					<div className="text-lg">{trans.text}</div>
					<Flagged name="text_to_speech">
						<Button
							size="icon"
							variant="neutral"
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
			className="mx-auto flex h-full w-full flex-col"
			style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
			data-name="flashcard"
			data-key={pid}
		>
			<CardContent className="relative flex grow flex-col items-center justify-center gap-4">
				<ContextMenu phrase={phrase} />
				<div className="pt-16">{questionContent}</div>
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
						className="mb-3 w-full max-w-160"
						onClick={() => setRevealCard(true)}
					>
						{isReverse ? 'Show Phrase' : 'Show Translations'}
					</Button>
				: answerMode === '2-buttons' ?
					<div
						data-name="answer-buttons-row"
						className="relative mb-3 grid w-full max-w-160 grid-cols-2 gap-3"
					>
						{coin && (
							<ScoreCoin
								key={coin.id}
								score={coin.score}
								onDone={() => setCoin(null)}
							/>
						)}
						<Button
							variant="default"
							data-testid="rating-again-button"
							onClick={() => submitScore(1)}
							disabled={isPending}
							className={cn(
								'h-auto rounded-2xl border-red-600! bg-red-600! py-6 text-2xl text-white hover:border-white! hover:bg-red-700!',
								prevData?.score === 1 && reviewStage < 4 ?
									'ring-primary ring-2 ring-offset-3'
								:	''
							)}
						>
							Forgot
						</Button>
						<Button
							variant="default"
							data-testid="rating-good-button"
							onClick={() => submitScore(3)}
							disabled={isPending}
							className={cn(
								'h-auto rounded-2xl border-green-500! bg-green-500! py-6 text-2xl text-white hover:border-white! hover:bg-green-600!',
								(
									prevData?.score === 3 ||
										prevData?.score === 2 ||
										prevData?.score === 4
								) ?
									'ring-primary ring-2 ring-offset-3'
								:	''
							)}
						>
							Correct!
						</Button>
					</div>
				:	<div
						data-name="answer-buttons-row"
						className="relative mb-3 grid w-full max-w-160 grid-cols-4"
					>
						{coin && (
							<ScoreCoin
								key={coin.id}
								score={coin.score}
								onDone={() => setCoin(null)}
							/>
						)}
						<Button
							variant="default"
							data-testid="rating-again-button"
							onClick={() => submitScore(1)}
							disabled={isPending}
							className={cn(
								'h-auto flex-col gap-0 rounded-none rounded-l-2xl border-red-600! bg-red-600! py-2 text-white hover:border-white! hover:bg-red-700!',
								prevData?.score === 1 && reviewStage < 4 ?
									'ring-primary ring-2 ring-offset-3'
								:	''
							)}
						>
							<span>Again</span>
							<span className="text-xs font-normal opacity-80">
								{nextIntervals[0]}
							</span>
						</Button>
						<Button
							variant="default"
							data-testid="rating-hard-button"
							onClick={() => submitScore(2)}
							disabled={isPending}
							className={cn(
								'h-auto flex-col gap-0 rounded-none border-gray-200! bg-gray-200! py-2 text-gray-700! hover:border-white! hover:bg-gray-300!',
								prevData?.score === 2 ? 'ring-primary ring-2 ring-offset-3' : ''
							)}
						>
							<span>Hard</span>
							<span className="text-xs font-normal opacity-60">
								{nextIntervals[1]}
							</span>
						</Button>
						<Button
							variant="default"
							data-testid="rating-good-button"
							onClick={() => submitScore(3)}
							disabled={isPending}
							className={cn(
								'h-auto flex-col gap-0 rounded-none border-green-500! bg-green-500! py-2 text-white hover:border-white! hover:bg-green-600!',
								prevData?.score === 3 ? 'ring-primary ring-2 ring-offset-3' : ''
							)}
						>
							<span>Good</span>
							<span className="text-xs font-normal opacity-80">
								{nextIntervals[2]}
							</span>
						</Button>
						<Button
							variant="default"
							data-testid="rating-easy-button"
							className={cn(
								'h-auto flex-col gap-0 rounded-none rounded-r-2xl border-blue-500 bg-blue-500! py-2 text-white hover:border-white! hover:bg-blue-600',
								prevData?.score === 4 ? 'ring-primary ring-2 ring-offset-3' : ''
							)}
							onClick={() => submitScore(4)}
							disabled={isPending}
						>
							<span>Easy</span>
							<span className="text-xs font-normal opacity-80">
								{nextIntervals[3]}
							</span>
						</Button>
					</div>
				}
			</CardFooter>
		</CardlikeFlashcard>
	)
}

function ContextMenu({ phrase }: { phrase: PhraseFullFilteredType }) {
	const [isOpen, setIsOpen] = useState(false)
	const [sendChatOpen, setSendChatOpen] = useState(false)
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
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Open context menu"
						className="absolute top-4 right-4"
					>
						<MoreVertical />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuItem
						onClick={() => cardStatusMutation.mutate('learned')}
						disabled={cardStatusMutation.isPending}
					>
						<BookmarkCheck className="me-2 h-4 w-4 text-green-600" />
						I've learned this
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => cardStatusMutation.mutate('skipped')}
						disabled={cardStatusMutation.isPending}
					>
						<BookmarkX className="me-2 h-4 w-4" />
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
					<DropdownMenuItem
						onClick={() => {
							setIsOpen(false)
							setSendChatOpen(true)
						}}
					>
						<Send className="me-2 h-4 w-4" />
						Send in chat
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
			<SendPhraseToFriendDialog
				phrase={phrase}
				open={sendChatOpen}
				onOpenChange={setSendChatOpen}
			/>
		</>
	)
}
