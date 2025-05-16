import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuccessCheckmark from '@/components/SuccessCheckmark'
import type { pids, ReviewRow, TranslationRow, uuid } from '@/types/main'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
	postReview,
	updateReview,
	getFromLocalStorage,
	getIndexOfNextUnreviewedCard,
	countUnfinishedCards,
} from '@/lib/use-reviewables'
import { PostgrestError } from '@supabase/supabase-js'
import PhraseExtraInfo from '../phrase-extra-info'
import Flagged from '../flagged'
import PermalinkButton from '../permalink-button'
import SharePhraseButton from '../share-phrase-button'
import { useLoaderData } from '@tanstack/react-router'

interface ComponentProps {
	dailyCacheKey: Array<string>
	pids: Array<uuid>
	// lang: string
}

const playAudio = (text: string) => {
	toast(`Playing audio for: ${text}`)
	// In a real application, you would trigger audio playback here
}

export function FlashCardReviewSession({
	dailyCacheKey,
	pids,
	// lang,
}: ComponentProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(() =>
		getIndexOfNextUnreviewedCard(dailyCacheKey, 0)
	)
	const [showTranslation, setShowTranslation] = useState(false)
	const { cardsMap, phrasesMap } = useLoaderData({
		from: '/_user/learn/$lang',
		select: (data) => ({
			cardsMap: data.deck.cardsMap,
			phrasesMap: data.language.phrasesMap,
		}),
	})

	const navigateCards = useCallback(
		(direction: 'forward' | 'back' | 'next' | 'skipped') => {
			if (direction === 'forward') setCurrentCardIndex((i) => i + 1)
			if (direction === 'back') setCurrentCardIndex((i) => i - 1)
			if (direction === 'next')
				setCurrentCardIndex((i) =>
					getIndexOfNextUnreviewedCard(dailyCacheKey, i)
				)
			if (direction === 'skipped')
				setCurrentCardIndex(() =>
					getIndexOfNextUnreviewedCard(dailyCacheKey, 0)
				)
			setShowTranslation(false)
		},
		[currentCardIndex, setCurrentCardIndex, setShowTranslation, dailyCacheKey]
	)

	const isComplete = currentCardIndex === pids.length

	return (
		<div className="flex-col items-center justify-center gap-2 py-2">
			<div
				className={`${isComplete ? 'flex' : 'hidden'} flex-col items-center justify-center gap-2`}
			>
				<div className={`flex min-h-10 flex-row items-center justify-center`}>
					<Button
						size="sm"
						variant="ghost"
						aria-label="back one card"
						onClick={() => navigateCards('back')}
						className="ps-2 pe-4"
					>
						<ChevronLeft className="me-1 size-4" /> Back one card
					</Button>
				</div>
				<Card className="mx-auto flex h-[80vh] w-full flex-col">
					{!isComplete ? null : (
						<WhenComplete
							pids={pids}
							dailyCacheKey={dailyCacheKey}
							go={() => navigateCards('skipped')}
						/>
					)}
				</Card>
			</div>
			<div
				className={`${isComplete ? 'hidden' : 'flex'} flex-col items-center justify-center gap-2`}
			>
				<div
					className={`flex min-h-10 flex-row items-center justify-center gap-4`}
				>
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
						Card {currentCardIndex + 1} of {pids.length}
					</div>
					<Button
						size="icon-sm"
						variant="default"
						onClick={() => navigateCards('forward')}
						disabled={currentCardIndex === pids.length}
						aria-label="Next card"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				{pids.map((pid, i) => {
					const phrase = phrasesMap[pid]
					const card = cardsMap[pid]
					if (!card || card === null) {
						console.log(`Error on this card render:`, pid, phrase, card)
						throw new Error(
							'Trying to review a card that does not exist. (Consider refreshing the page.)'
						)
					}
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
									params={{ lang: phrase.lang!, id: phrase.id! }}
								/>
								<SharePhraseButton lang={phrase.lang!} pid={phrase.id!} />
								<PhraseExtraInfo lang={phrase.lang!} pid={phrase.id!} />
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
											onClick={() => playAudio(phrase.text!)}
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
								dailyCacheKey={dailyCacheKey}
								// lang={lang}
								pid={pid}
								user_card_id={card.id!}
								isButtonsShown={showTranslation}
								showTheButtons={() => setShowTranslation(true)}
								proceed={() => {
									navigateCards('next')
								}}
							/>
						</Card>
					)
				})}
			</div>
		</div>
	)
}

interface CardInnerProps {
	dailyCacheKey: Array<string>
	// lang: string
	pid: uuid
	user_card_id: uuid
	isButtonsShown: boolean
	showTheButtons: () => void
	proceed: () => void
}

function UserCardReviewScoreButtonsRow({
	dailyCacheKey,
	user_card_id,
	pid,
	// lang,
	isButtonsShown,
	showTheButtons,
	proceed,
}: CardInnerProps) {
	const prevData = getFromLocalStorage<ReviewRow>([...dailyCacheKey, pid])

	const queryClient = useQueryClient()
	const { mutate, isPending } = useMutation<
		ReviewRow,
		PostgrestError,
		{ score: number }
	>({
		mutationKey: [...dailyCacheKey, pid],
		mutationFn: async ({ score }: { score: number }) => {
			if (prevData?.score === score) return prevData

			return prevData?.id ?
					await updateReview({
						score,
						review_id: prevData.id,
					})
				:	await postReview({
						score,
						user_card_id,
						day_session: dailyCacheKey[3],
					})
		},
		onSuccess: (data) => {
			if (data.score === 1)
				toast('okay', { icon: '🤔', position: 'bottom-center' })
			if (data.score === 2)
				toast('okay', { icon: '🤷', position: 'bottom-center' })
			if (data.score === 3)
				toast('got it', { icon: '👍️', position: 'bottom-center' })
			if (data.score === 4) toast.success('nice', { position: 'bottom-center' })
			localStorage.setItem(
				JSON.stringify([...dailyCacheKey, pid]),
				JSON.stringify(data)
			)
			void queryClient.invalidateQueries({
				queryKey: [...dailyCacheKey, pid],
			})
			setTimeout(proceed, 1500)
		},
		onError: (error) => {
			toast.error(`There was some kind of error idk: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})

	return (
		<CardFooter className="flex flex-col">
			{!isButtonsShown && !prevData ?
				<Button className="mb-3 w-full" onClick={showTheButtons}>
					Show Translation
				</Button>
			:	<div className="mb-3 grid w-full grid-cols-4 gap-2">
					<Button
						variant="destructive"
						onClick={() => mutate({ score: 1 })}
						disabled={isPending}
						className={
							prevData?.score === 1 ? 'ring-primary ring-2 ring-offset-3' : ''
						}
					>
						Again
					</Button>
					<Button
						variant="secondary"
						onClick={() => mutate({ score: 2 })}
						disabled={isPending}
						className={
							prevData?.score === 2 ? 'ring-primary ring-2 ring-offset-3' : ''
						}
					>
						Hard
					</Button>
					<Button
						variant="default"
						onClick={() => mutate({ score: 3 })}
						disabled={isPending}
						className={cn(
							'bg-green-500 hover:bg-green-600',
							prevData?.score === 3 ? 'ring-primary ring-2 ring-offset-3' : ''
						)}
					>
						Good
					</Button>
					<Button
						variant="default"
						className={cn(
							'bg-blue-500 hover:bg-blue-600',
							prevData?.score === 4 ? 'ring-primary ring-2 ring-offset-3' : ''
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

function WhenComplete({
	pids,
	dailyCacheKey,
	go,
}: {
	pids: pids
	dailyCacheKey: Array<string>
	go: () => void
}) {
	const skippedCardsCount = countUnfinishedCards(pids, dailyCacheKey)
	return skippedCardsCount ?
			<CardContent className="flex grow flex-col items-center justify-center gap-6 pt-0 pb-16">
				<h2 className="text-2xl font-bold">Almost there!</h2>
				<p className="text-center text-lg">
					You're at the end of the queue, but there are still{' '}
					{skippedCardsCount} cards you skipped over. Let's go back and finish
					them &mdash; you can do it!
				</p>
				<Button size="lg" onClick={go}>
					Review incomplete cards
				</Button>
			</CardContent>
		:	<CardContent className="flex grow flex-col items-center justify-center gap-6 pt-0 pb-16">
				<h2 className="text-2xl font-bold">Good work!</h2>
				<p className="text-lg">You've completed your review for today.</p>
				<SuccessCheckmark />
			</CardContent>
}
