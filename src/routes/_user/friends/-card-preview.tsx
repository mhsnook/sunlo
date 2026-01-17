import { CSSProperties } from 'react'
import type { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'

import { CardContent, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { Loader } from '@/components/ui/loader'
import { usePhrase } from '@/hooks/composite-phrase'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { LangBadge } from '@/components/ui/badge'

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
				<CardContent className="space-y-2 p-4">
					<div className="flex items-center justify-between gap-2">
						<CardTitle className="text-lg">{phrase.text}</CardTitle>
						<LangBadge lang={phrase.lang} />
					</div>
					{chosenTranslation ?
						<p className="text-muted-foreground">{chosenTranslation.text}</p>
					:	<p className="text-muted-foreground text-sm italic">
							No translations yet
						</p>
					}
				</CardContent>
			</CardlikeFlashcard>
		</Link>
	)
}
