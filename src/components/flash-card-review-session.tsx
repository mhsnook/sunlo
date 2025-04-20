import { useState } from 'react'
import toast from 'react-hot-toast'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuccessCheckmark from '@/components/SuccessCheckmark'
import type {
	CardFull,
	ReviewScheduled,
	TranslationRow,
	uuid,
} from '@/types/main'
import { useLanguagePhrasesMap } from '@/lib/use-language'
import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { postReview } from '@/lib/use-reviewables'
import { PostgrestError } from '@supabase/supabase-js'
import PhraseExtraInfo from './phrase-extra-info'
import Flagged from './flagged'
import PermalinkButton from './permalink-button'
import SharePhraseButton from './share-phrase-button'

interface ComponentProps {
	cards: Array<CardFull>
	lang: string
}

const playAudio = (text: string) => {
	toast(`Playing audio for: ${text}`)
	// In a real application, you would trigger audio playback here
}

export function FlashCardReviewSession({ lang, cards }: ComponentProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(0)
	const [showTranslation, setShowTranslation] = useState(false)
	const { data: phrasesMap } = useLanguagePhrasesMap(lang)

	const navigateCards = (direction: 'forward' | 'back') => {
		if (direction === 'forward') setCurrentCardIndex(currentCardIndex + 1)
		if (direction === 'back') setCurrentCardIndex(currentCardIndex - 1)
		setShowTranslation(false)
	}

	const isComplete = currentCardIndex === cards.length

	return (
		<>
			<div
				className={`${isComplete ? 'flex' : 'hidden'} flex-col items-center justify-center gap-4`}
			>
				<div className="flex min-h-10 flex-row items-center justify-center">
					<Button
						size="sm"
						variant="default"
						aria-label="back to cards"
						onClick={() => navigateCards('back')}
						className="ps-2 pe-4"
					>
						<ChevronLeft className="me-1 size-4" /> Back to cards
					</Button>
				</div>
				<Card className={`mx-auto flex h-[80vh] w-full flex-col`}>
					<WhenComplete />
				</Card>
			</div>
			<div
				className={`${isComplete ? 'hidden' : 'flex'} flex-col items-center justify-center gap-4`}
			>
				<div className="flex min-h-10 flex-row items-center justify-center gap-4">
					<Button
						size="icon-sm"
						variant="default"
						onClick={() => navigateCards('back')}
						disabled={currentCardIndex === 0}
						aria-label="Previous card"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<div className="text-center text-sm">
						Card {currentCardIndex + 1} of {cards.length}
					</div>
					<Button
						size="icon-sm"
						variant="default"
						onClick={() => navigateCards('forward')}
						disabled={currentCardIndex === cards.length}
						aria-label="Next card"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>
				{cards.map((card, i) => {
					const phrase = phrasesMap[card.phrase_id]
					return (
						<Card
							key={i}
							className={cn(
								`mx-auto h-[80vh] w-full flex-col`,
								i === currentCardIndex ? 'flex' : 'hidden'
							)}
						>
							<CardHeader className="flex flex-row items-center justify-end gap-2">
								<PermalinkButton
									to={'/learn/$lang/$id'}
									params={{ lang: phrase.lang, id: phrase.id }}
								/>
								<SharePhraseButton lang={phrase.lang} pid={phrase.id} />
								<PhraseExtraInfo lang={phrase.lang} pid={phrase.id} />
							</CardHeader>
							<CardContent
								className={`flex grow flex-col items-center justify-center px-[10%] pt-0`}
							>
								<div className="mb-4 flex items-center justify-center">
									<div className="mr-2 text-2xl font-bold">{phrase.text}</div>
									<Flagged name="text_to_speech">
										<Button
											size="icon"
											variant="secondary"
											onClick={() => playAudio(phrase.text)}
											aria-label="Play original phrase"
										>
											<Play className="size-4" />
										</Button>
									</Flagged>
								</div>
								<div>
									{!showTranslation ? null : (
										phrase.translations.map((trans: TranslationRow) => (
											<div key={trans.id} className="mt-4 flex items-center">
												<span className="mr-2 rounded-md bg-gray-200 px-2 py-1 text-xs text-gray-700">
													{trans.lang}
												</span>
												<div className="me-2 text-xl">{trans.text}</div>
												<Flagged name="text_to_speech">
													<Button
														size="icon-sm"
														variant="secondary"
														onClick={() => playAudio(trans.text)}
														aria-label="Play translation"
													>
														<Play className="size-4" />
													</Button>
												</Flagged>
											</div>
										))
									)}
								</div>
							</CardContent>
							<UserCardReviewScoreButtonsRow
								user_card_id={card.id!}
								isButtonsShown={showTranslation}
								showTheButtons={() => setShowTranslation(true)}
								proceed={() => {
									setShowTranslation(false)
									navigateCards('forward')
								}}
							/>
						</Card>
					)
				})}
			</div>
		</>
	)
}

interface CardInnerProps {
	user_card_id: uuid
	isButtonsShown: boolean
	showTheButtons: () => void
	proceed: () => void
}

function UserCardReviewScoreButtonsRow({
	user_card_id,
	isButtonsShown,
	showTheButtons,
	proceed,
}: CardInnerProps) {
	const { data, mutate, isPending } = useMutation<
		ReviewScheduled,
		PostgrestError,
		{ score: number }
	>({
		mutationFn: async ({ score }: { score: number }) => {
			// if (data?.score === score) return data
			const res = await postReview({
				score,
				user_card_id,
			})
			return res
		},
		onSuccess: (data) => {
			console.log(`Review mutation success; next scheduled at:`, data)
			if (data.score === 1)
				toast('okay', { icon: '🤔', position: 'bottom-center' })
			if (data.score === 2)
				toast('okay', { icon: '🤷', position: 'bottom-center' })
			if (data.score === 3)
				toast('got it', { icon: '👍️', position: 'bottom-center' })
			if (data.score === 4) toast.success('nice', { position: 'bottom-center' })
			setTimeout(proceed, 1500)
		},
		onError: (error) => {
			toast.error(`There was some kind of error idk: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})

	return (
		<CardFooter className="flex flex-col">
			{!isButtonsShown ?
				<Button className="mb-3 w-full" onClick={showTheButtons}>
					Show Translation
				</Button>
			:	<div className="mb-3 grid w-full grid-cols-4 gap-2">
					<Button
						variant="destructive"
						onClick={() => mutate({ score: 1 })}
						disabled={isPending}
						className={data?.score === 1 ? 'ring-3 ring-offset-1' : ''}
					>
						Again
					</Button>
					<Button
						variant="secondary"
						onClick={() => mutate({ score: 2 })}
						disabled={isPending}
						className={data?.score === 2 ? 'ring-3 ring-offset-1' : ''}
					>
						Hard
					</Button>
					<Button
						variant="default"
						onClick={() => mutate({ score: 3 })}
						disabled={isPending}
						className={cn(
							'bg-green-500 hover:bg-green-600',
							data?.score === 3 ? 'ring-3 ring-offset-1' : ''
						)}
					>
						Good
					</Button>
					<Button
						variant="default"
						className={cn(
							'bg-blue-500 hover:bg-blue-600',
							data?.score === 4 ? 'ring-3 ring-offset-1' : ''
						)}
						onClick={() => mutate({ score: 4 })}
						disabled={isPending}
					>
						Easy
					</Button>
				</div>
			}
		</CardFooter>
	)
}

function WhenComplete() {
	return (
		<>
			<CardContent className="flex grow flex-col items-center justify-center gap-4 pt-0 pb-16">
				<h2 className="text-2xl font-bold">Good work!</h2>
				<p className="text-lg">You've completed your review for today.</p>
				<SuccessCheckmark />
			</CardContent>
		</>
	)
}
