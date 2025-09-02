import { PhraseStub } from '@/types/main'
import PermalinkButton from '../permalink-button'
import { LangBadge } from '../ui/badge'
import { CardStatusHeart } from '../card-status-dropdown'

export function CardResultSimple({ phrase }: { phrase: PhraseStub }) {
	if (!phrase.id || !phrase.lang) return null

	return (
		<div className="bg-card rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<h4 className="font-semibold">{phrase.text}</h4>
				<div className="space-x-2">
					<PermalinkButton
						to="/learn/$lang/$id"
						params={{ lang: phrase.lang, id: phrase.id }}
						variant="ghost"
						size="icon-sm"
						text=""
					/>
					<CardStatusHeart pid={phrase.id} lang={phrase.lang} />
				</div>
			</div>
			<ul className="mt-2 space-y-1">
				{phrase.translations?.map((t) => (
					<li key={t.id} className="flex items-center gap-2 text-sm">
						<LangBadge lang={t.lang!} />
						<span>{t.text}</span>
					</li>
				))}
			</ul>
		</div>
	)
}
