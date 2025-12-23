import { CSSProperties, useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { MoreVertical, Play } from 'lucide-react'

import { CardContent, CardFooter } from '@/components/ui/card'
import { cn, preventDefaultCallback } from '@/lib/utils'
import PermalinkButton from '@/components/permalink-button'
import PhraseExtraInfo from '@/components/phrase-extra-info'
import Flagged from '@/components/flagged'
import { Button } from '@/components/ui/button'
import { useOneReviewToday, useReviewMutation } from '@/hooks/use-reviews'
import { Separator } from '@/components/ui/separator'
import { LangBadge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SendPhraseToFriendButton } from '@/components/card-pieces/send-phrase-to-friend'
import { PhraseFullFilteredType, TranslationType } from '@/lib/schemas'
import { uuid } from '@/types/main'
import { usePhrase } from '@/hooks/composite-phrase'
import { CardlikeFlashcard } from '@/components/ui/card-like'

const playAudio = (text: string) => {
	toast(`Playing audio for: ${text}`)
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
	const closeCard = useCallback(() => setRevealCard(false), [setRevealCard])
	const { mutate, isPending } = useReviewMutation(
		pid,
		dayString,
		closeCard,
		reviewStage,
		prevData
	)

	if (!phrase) return null

	const showAnswers = prevData && reviewStage === 1 ? true : revealCard
	return (
		<CardlikeFlashcard
			className="mx-auto flex min-h-[80vh] w-full flex-col"
			// oxlint-disable-next-line jsx-no-new-object-as-prop
			style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
		>
			<CardContent className="relative flex grow flex-col items-center justify-center pt-0">
				<ContextMenu phrase={phrase} />
				<div className="mb-4 flex items-center justify-center">
					<div className="mr-2 text-2xl font-bold">{phrase.text}</div>
					<Flagged name="text_to_speech">
						<Button
							size="icon"
							variant="secondary"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => playAudio(phrase.text)}
							aria-label="Play original phrase"
						>
							<Play className="size-4" />
						</Button>
					</Flagged>
				</div>
				<Separator />

				<div
					className={`w-full space-y-2 transition-opacity ${showAnswers ? 'opacity-100' : 'opacity-0'}`}
				>
					{phrase.translations?.map((trans: TranslationType) => (
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
								prevData?.score === 1 && reviewStage < 4 ?
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
		</CardlikeFlashcard>
	)
}

function ContextMenu({ phrase }: { phrase: PhraseFullFilteredType }) {
	const [isOpen, setIsOpen] = useState(false)
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
				<DropdownMenuItem onSelect={preventDefaultCallback} className="p-0">
					<PermalinkButton
						to={'/learn/$lang/$id'}
						// oxlint-disable-next-line jsx-no-new-object-as-prop
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
