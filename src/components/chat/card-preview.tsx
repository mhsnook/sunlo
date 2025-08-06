import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguagePhrase } from '@/lib/use-language'
import Callout from '../ui/callout'
import { useDeckCard } from '@/lib/use-deck'
import { uuid } from '@/types/main'
import { ago } from '@/lib/dayjs'
import { CardStatusDropdown } from '../card-status-dropdown'

export function CardPreview({
	pid,
	lang,
	isMine,
}: {
	pid: uuid
	lang: string
	isMine: boolean
}) {
	const { data: phrase, isPending } = useLanguagePhrase(pid, lang)
	const { data: card } = useDeckCard(pid, lang)

	return (
		isPending ? null
		: !phrase ?
			<Callout variant="problem">Can't seem to find that phrase...</Callout>
		:	<Card
				className={`bg-background mt relative z-10 -mb-1 ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
			>
				<CardHeader className="p-4">
					<CardTitle className="text-lg">
						{phrase.text}{' '}
						<span className="text-sm font-normal">[{phrase.lang}]</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 p-4 pt-0">
					<p className="text-muted-foreground">
						{phrase.translations[0].text}{' '}
						<span className="text-sm font-normal">
							[{phrase.translations[0].lang}]
						</span>
					</p>
					<div className="flex items-center gap-2 text-xs">
						{card?.next_due_at && (
							<span className="text-muted-foreground">
								Next review: {ago(card.next_due_at)}
							</span>
						)}
					</div>
					<CardStatusDropdown pid={pid} lang={lang} action />
				</CardContent>
			</Card>
	)
}
