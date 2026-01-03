import type { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'
import { LinkIcon } from 'lucide-react'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { CardStatusDropdown } from '@/components/card-pieces/card-status-dropdown'
import { AddTranslationsDialog } from '@/components/card-pieces/add-translations'
import { buttonVariants } from '@/components/ui/button-variants'
import { Loader } from '@/components/ui/loader'
import { usePhrase } from '@/hooks/composite-phrase'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { CSSProperties } from 'react'

export function CardPreview({ pid, isMine }: { pid: uuid; isMine: boolean }) {
	const { data: phrase, status } = usePhrase(pid)
	const chosenTranslation = phrase?.translations[0]

	if (status === 'not-found')
		return (
			<Callout variant="problem">Can't seem to find that phrase...</Callout>
		)
	return (
		<CardlikeFlashcard
			className={`relative z-10 mb-0 ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
			// oxlint-disable-next-line jsx-no-new-object-as-prop
			style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
		>
			{status === 'pending' || !phrase ?
				<Loader className="my-6" />
			:	<>
					<CardHeader className="p-4">
						<CardTitle className="text-lg">
							{phrase.text}{' '}
							<span className="text-sm font-normal">[{phrase.lang}]</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 p-4 pt-0">
						{chosenTranslation ?
							<p className="text-muted-foreground">
								{chosenTranslation.text}{' '}
								<span className="text-sm font-normal">
									[{chosenTranslation.lang}]
								</span>
							</p>
						:	<p className="text-muted-foreground italic">
								There are currently no translations for this phrase. You can
								help by adding some.
							</p>
						}
						<div className="flex items-center gap-2 text-xs">
							{/*card?.next_due_at && (
								<span className="text-muted-foreground">
									Next review: {ago(card.next_due_at)}
								</span>
							)*/}
						</div>
						<div className="flex flex-row flex-wrap gap-2">
							<CardStatusDropdown phrase={phrase} />
							{!chosenTranslation && (
								<AddTranslationsDialog
									size="sm"
									variant="secondary"
									phrase={phrase}
								/>
							)}
							<Link
								to={'/learn/$lang/phrases/$id'}
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={{ lang: phrase.lang, id: pid }}
								className={buttonVariants({
									variant: 'secondary',
									size: 'sm',
								})}
							>
								<LinkIcon className="text-muted-foreground" />
								View phrase
							</Link>
						</div>
					</CardContent>
				</>
			}
		</CardlikeFlashcard>
	)
}
