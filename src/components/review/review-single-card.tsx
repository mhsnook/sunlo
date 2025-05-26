import {
	postReview,
	updateReview,
	getReviewFromLocalStorage,
	setReviewFromLocalStorage,
	useReviewState,
} from '@/lib/use-reviewables'
import { DailyCacheKey, ReviewRow, TranslationRow, uuid } from '@/types/main'
import { PostgrestError } from '@supabase/supabase-js'
import {
	useMutation,
	// useQueryClient
} from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import PermalinkButton from '@/components/permalink-button'
import SharePhraseButton from '@/components/share-phrase-button'
import PhraseExtraInfo from '@/components/phrase-extra-info'
import Flagged from '@/components/flagged'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import { useLanguagePhrase } from '@/lib/use-language'
import { useDeckCard } from '@/lib/use-deck'

interface ReviewSingleCardProps {
	dailyCacheKey: DailyCacheKey
	pid: uuid
	proceed: () => void
}

const playAudio = (text: string) => {
	toast(`Playing audio for: ${text}`)
	// In a real application, you would trigger audio playback here
}

export function ReviewSingleCard({
	dailyCacheKey,
	pid,
	proceed,
}: ReviewSingleCardProps) {
	const lang = dailyCacheKey[1]
	const [revealCard, setRevealCard] = useState(false)
	const [prevData, setPrevData] = useState<ReviewRow | null>(
		getReviewFromLocalStorage(dailyCacheKey, pid)
	)
	const { data: state } = useReviewState(dailyCacheKey)

	const { data: phrase } = useLanguagePhrase(pid, lang)
	const { data: card } = useDeckCard(pid, lang)

	// const queryClient = useQueryClient()
	const { mutate, isPending } = useMutation<
		ReviewRow,
		PostgrestError,
		{ score: number }
	>({
		mutationKey: [...dailyCacheKey, pid],
		// @ts-expect-error ts-2322
		mutationFn: async ({ score }: { score: number }) => {
			if (!card || !card.id)
				throw new Error('Trying card review mutation but no card exists')

			// We want 1 mutation per day per card. We can send a second mutation
			// only during stage 1 or 2, to _correct_ an improper input.

			// no mutations when re-reviewing incorrect
			if (state.reviewStage > 3)
				return {
					...prevData,
					score,
				}

			// during stages 1 and 2 send an update only if the score has changed
			if (prevData?.score === score) return prevData
			if (prevData?.id)
				return await updateReview({
					score,
					review_id: prevData.id,
				})

			// standard case: card has not been reviewed today
			return await postReview({
				score,
				user_card_id: card.id,
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

			const mergedData = { ...prevData, ...data }
			setReviewFromLocalStorage(dailyCacheKey, pid, mergedData)
			setPrevData(mergedData)
			// queryClient.setQueryData([...dailyCacheKey, pid], data)
			/* void queryClient.invalidateQueries({
				queryKey: [...dailyCacheKey, pid],
			}) */
			setTimeout(proceed, 1000)
		},
		onError: (error) => {
			toast.error(`There was an error posting your review: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})

	if (!phrase || !card) return null

	const showAnswers = prevData && state.reviewStage === 1 ? true : revealCard
	return (
		<Card className="mx-auto flex min-h-[80vh] w-full flex-col">
			<CardHeader className="flex flex-row items-center justify-end gap-2">
				<PermalinkButton
					to={'/learn/$lang/$id'}
					params={{ lang: lang, id: pid }}
				/>
				<SharePhraseButton lang={lang} pid={pid} />
				<PhraseExtraInfo lang={lang} pid={pid} />
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
					{!showAnswers ? null : (
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
			<CardFooter className="flex flex-col">
				{!showAnswers ?
					<Button className="mb-3 w-full" onClick={() => setRevealCard(true)}>
						Show Translation
					</Button>
				:	<div className="mb-3 grid w-full grid-cols-4 gap-2">
						<Button
							variant="destructive"
							onClick={() => mutate({ score: 1 })}
							disabled={isPending}
							className={
								prevData?.score === 1 && state.reviewStage !== 4 ?
									'ring-primary ring-2 ring-offset-3'
								:	''
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
		</Card>
	)
}
