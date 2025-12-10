import PermalinkButton from '@/components/permalink-button'
import { LangBadge } from '@/components/ui/badge'
import { CardStatusHeart } from '@/components/card-status-dropdown'
import { PhraseFullFilteredType } from '@/lib/schemas'
import { Card } from '../ui/card'

export function CardResultSimple({
	phrase,
}: {
	phrase: PhraseFullFilteredType
}) {
	return (
		<Card className="border-primary-foresoft/50 space-y-4 rounded-s-none border-s-4 p-6">
			<div className="flex items-center justify-between">
				<h4 className="inline-flex gap-2 align-baseline font-semibold">
					<LangBadge lang={phrase.lang} /> &ldquo;{phrase.text}&rdquo;
				</h4>

				<div className="space-x-2">
					<PermalinkButton
						to="/learn/$lang/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: phrase.lang, id: phrase.id }}
						variant="ghost"
						size="icon"
						text=""
					/>
					<CardStatusHeart phrase={phrase} />
				</div>
			</div>
			<ul className="mt-2 space-y-1">
				{phrase.translations?.map((t) => (
					<li key={t.id} className="flex items-center gap-2 text-sm">
						<LangBadge lang={t.lang} />
						<span>&ldquo;{t.text}&rdquo;</span>
					</li>
				))}
			</ul>
		</Card>
	)
}
