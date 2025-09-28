import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { Play } from 'lucide-react'

import { OnePhraseComponentProps, TranslationRow } from '@/types/main'
import { useReviewDayString, useReviewStage } from '@/hooks/use-review-store'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import PermalinkButton from '@/components/permalink-button'
import SharePhraseButton from '@/components/share-phrase-button'
import PhraseExtraInfo from '@/components/phrase-extra-info'
import Flagged from '@/components/flagged'
import { Button } from '@/components/ui/button'
import { useLanguagePhrase } from '@/hooks/use-language'
import { useOneReviewToday, useReviewMutation } from '@/hooks/use-reviews'
import { Separator } from '@/components/ui/separator'
import { LangBadge } from '@/components/ui/badge'

const playAudio = (text: string) => {
	toast(`Playing audio for: ${text}`)
	// In a real application, you would trigger audio playback here
}

export function ReviewSingleCard({ pid, lang }: OnePhraseComponentProps) {
	const dayString = useReviewDayString()
	const [revealCard, setRevealCard] = useState(false)
	const { data: prevData } = useOneReviewToday(lang, dayString, pid)
	const stage = useReviewStage()
	const closeCard = useCallback(() => setRevealCard(false), [setRevealCard])
	const { mutate, isPending } = useReviewMutation(
		pid,
		lang,
		dayString,
		closeCard
	)

	const { data: phrase } = useLanguagePhrase(pid, lang)

	if (!phrase) return null

	const showAnswers = prevData && stage === 1 ? true : revealCard
	return (
		<Card className="mx-auto flex min-h-[80vh] w-full flex-col">
			<CardHeader className="flex flex-row items-center justify-end gap-2">
				<PermalinkButton
					to={'/learn/$lang/$id'}
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					params={{ lang, id: pid }}
				/>
				<SharePhraseButton lang={lang} pid={pid} />
				<PhraseExtraInfo lang={lang} pid={pid} />
			</CardHeader>
			<CardContent className="flex grow flex-col items-center justify-center pt-0">
				<div className="mb-4 flex items-center justify-center">
					<div className="mr-2 text-2xl font-bold">{phrase.text}</div>
					<Flagged name="text_to_speech">
						<Button
							size="icon"
							variant="secondary"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => playAudio(phrase.text!)}
							aria-label="Play original phrase"
						>
							<Play className="size-4" />
						</Button>
					</Flagged>
				</div>
				<Separator />
				{!showAnswers ? null : (
					<div className="w-full space-y-2">
						{phrase.translations.map((trans: TranslationRow) => (
							<div
								key={trans.id}
								className="mt-4 flex items-center justify-center gap-2"
							>
								<LangBadge lang={trans.lang} />
								<div className="me-2 text-xl">{trans.text}</div>
								<Flagged name="text_to_speech">
									<Button
										size="icon"
										variant="secondary"
										// oxlint-disable-next-line jsx-no-new-function-as-prop
										onClick={() => playAudio(trans.text)}
										aria-label="Play translation"
									>
										<Play className="size-4" />
									</Button>
								</Flagged>
							</div>
						))}
					</div>
				)}
			</CardContent>
			<CardFooter className="flex flex-col">
				{!showAnswers ?
					<Button
						className="mb-3 w-full"
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => setRevealCard(true)}
					>
						Show Translation
					</Button>
				:	<div className="mb-3 grid w-full grid-cols-4 gap-2">
						<Button
							variant="destructive"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => mutate({ score: 1 })}
							disabled={isPending}
							className={
								prevData?.score === 1 && stage < 4 ?
									'ring-primary ring-2 ring-offset-3'
								:	''
							}
						>
							Again
						</Button>
						<Button
							variant="secondary"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
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
							// oxlint-disable-next-line jsx-no-new-function-as-prop
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
							// oxlint-disable-next-line jsx-no-new-function-as-prop
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
