import type { PhraseFullFilteredType } from '@/lib/schemas'
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge, LangBadge } from '@/components/ui/badge'
import { CardStatusHeart } from '@/components/card-pieces/card-status-dropdown'
import PermalinkButton from '@/components/permalink-button'
import SharePhraseButton from '@/components/card-pieces/share-phrase-button'

export function PhraseAccordionItem({
	phrase,
}: {
	phrase: PhraseFullFilteredType
}) {
	return (
		<AccordionItem value={phrase.id} className="mb-2 rounded px-2 shadow-sm">
			<div className="ms-3 flex flex-row items-center gap-2">
				<CardStatusHeart phrase={phrase} />
				<AccordionTrigger>{phrase.text}</AccordionTrigger>
			</div>
			<AccordionContent>
				<div className="space-y-1 pt-2 pl-4">
					<p className="text-muted-foreground text-sm">
						{phrase.translations?.length ? 'Translations' : 'No Translations'}
					</p>
					<ul className="space-y-1">
						{phrase.translations_mine?.map((translation) => (
							<li key={translation.id} className="flex items-center gap-2">
								<LangBadge lang={translation.lang} />
								<span className="text-sm">{translation.text}</span>
							</li>
						))}
					</ul>
					<div className="flex flex-row flex-wrap gap-2 py-2">
						<span className="text-muted-foreground text-sm">
							{phrase.tags?.length ? 'Tags' : 'No tags'}
						</span>
						{phrase.tags?.map((tag) => (
							<Badge variant="outline" key={tag.id}>
								{tag.name}
							</Badge>
						))}
					</div>
					<div className="my-4 flex flex-row items-center gap-2">
						<PermalinkButton
							to="/learn/$lang/phrases/$id"
							// oxlint-disable-next-line jsx-no-new-object-as-prop
							params={{ lang: phrase.lang, id: phrase.id }}
							variant="outline-accent"
							text="View details"
						/>
						<SharePhraseButton phrase={phrase} variant="outline-accent" />
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	)
}
