import PermalinkButton from '@/components/permalink-button'
import { LangBadge } from '@/components/ui/badge'
import { CardStatusHeart } from '@/components/card-pieces/card-status-dropdown'
import { PhraseFullFilteredType, PhraseFullFullType } from '@/lib/schemas'
import { CardlikeFlashcard } from '@/components/ui/card-like'

export function CardResultSimple({
	phrase,
	nonInteractive,
}: {
	phrase: PhraseFullFilteredType | PhraseFullFullType
	nonInteractive?: boolean
}) {
	return (
		<CardlikeFlashcard className="flex max-w-120 flex-row gap-2 py-0 ps-4 pe-1">
			<div className="grow py-6">
				<div className="space-x-2 pb-2">
					<LangBadge lang={phrase.lang} />
					<h4 className="inline-flex gap-2 align-baseline font-semibold">
						&ldquo;{phrase.text}&rdquo;
					</h4>
				</div>
				<ul className="mt-2 space-y-1">
					{phrase.translations?.map((t) => (
						<li key={t.id} className="flex items-center gap-2 text-sm">
							<LangBadge lang={t.lang} />
							<span>&ldquo;{t.text}&rdquo;</span>
						</li>
					))}
				</ul>
			</div>
			{nonInteractive ? null : (
				<div className="flex flex-col gap-2 px-4 py-4">
					<CardStatusHeart phrase={phrase} />
					<PermalinkButton
						to="/learn/$lang/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: phrase.lang, id: phrase.id }}
						variant="ghost"
						size="icon"
						text=""
					/>
				</div>
			)}
		</CardlikeFlashcard>
	)
}
