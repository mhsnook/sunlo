import { CSSProperties } from 'react'
import type { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'

import { CardContent, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { CardStatusHeart } from '@/components/card-pieces/card-status-dropdown'
import { Loader } from '@/components/ui/loader'
import { usePhrase } from '@/hooks/composite-phrase'
import { CardlikeFlashcard } from '@/components/ui/card-like'

export function CardPreview({ pid, isMine }: { pid: uuid; isMine: boolean }) {
	const { data: phrase, status } = usePhrase(pid)
	const chosenTranslation = phrase?.translations[0]

	if (status === 'pending') return <Loader className="my-6" />
	if (status === 'not-found' || !phrase)
		return (
			<Callout variant="problem">Can't seem to find that phrase...</Callout>
		)
	return (
		<Link
			to={'/learn/$lang/phrases/$id'}
			params={{ lang: phrase.lang, id: pid }}
		>
			<CardlikeFlashcard
				className={`relative z-10 mb-0 ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
				style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
			>
				<CardContent className="flex flex-row space-y-2 p-4">
					<div className="flex-1">
						<CardTitle className="text-lg">
							{phrase.text}{' '}
							<span className="text-sm font-normal">[{phrase.lang}]</span>
						</CardTitle>
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
					</div>
					<div className="flex grow-0 flex-col flex-wrap justify-start gap-2">
						<CardStatusHeart phrase={phrase} />
					</div>
				</CardContent>
			</CardlikeFlashcard>
		</Link>
	)
}
