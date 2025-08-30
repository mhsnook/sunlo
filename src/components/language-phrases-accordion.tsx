import { PhraseFiltered, pids } from '@/types/main'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'

import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { useMemo } from 'react'
import { CardStatusDropdown } from './card-status-dropdown'
import { AddTranslationsDialog } from './add-translations-dialog'
import PermalinkButton from './permalink-button'
import SharePhraseButton from './share-phrase-button'
import PhraseExtraInfo from './phrase-extra-info'
import { Badge, LangBadge } from './ui/badge'

interface PhrasesWithOptionalOrder {
	lang: string
	pids?: pids | null
}

export function LanguagePhrasesAccordionComponent({
	lang,
	pids = null,
}: PhrasesWithOptionalOrder) {
	// we are using filtered phrases but unfiltered pids
	// because the user will manage filtering
	const { phrasesMapFiltered, language: languagePids } =
		useDeckPidsAndRecs(lang)

	const pidsToUse = pids ?? languagePids

	return (
		<Accordion type="single" collapsible className="w-full">
			{pidsToUse.map((pid) => (
				<PhraseAccordionItem key={pid} phrase={phrasesMapFiltered[pid]} />
			))}
		</Accordion>
	)
}

function PhraseAccordionItem({ phrase }: { phrase: PhraseFiltered }) {
	const params = useMemo(
		() => ({ lang: phrase.lang!, id: phrase.id! }),
		[phrase.id, phrase.lang]
	)
	return (
		<AccordionItem value={phrase.id!} className="mb-2 rounded px-2 shadow-sm">
			<div className="flex flex-row items-center gap-2">
				<CardStatusDropdown lang={phrase.lang!} pid={phrase.id!} />
				<AccordionTrigger>{phrase.text}</AccordionTrigger>
			</div>
			<AccordionContent>
				<div className="space-y-1 pt-2 pl-6">
					<p className="text-muted-foreground text-sm">Translations</p>
					<ul className="space-y-1">
						{phrase.translations_mine?.map((translation) => (
							<li key={translation.id} className="flex items-center gap-2">
								<LangBadge lang={translation.lang} />
								<span className="text-sm">{translation.text}</span>
							</li>
						))}
					</ul>
					<div className="flex flex-row flex-wrap gap-2 py-2">
						<span className="text-muted-foreground text-sm">Tags</span>
						{phrase.tags?.map((tag) => (
							<Badge variant="outline" key={tag.id}>
								{tag.name}
							</Badge>
						))}
					</div>
					<div className="my-4 flex flex-row gap-2">
						<PermalinkButton
							to="/learn/$lang/$id"
							params={params}
							variant="link"
							className="text-xs"
						/>
						<SharePhraseButton
							pid={phrase.id!}
							lang={phrase.lang!}
							variant="link"
							className="text-xs"
						/>
						<PhraseExtraInfo
							lang={phrase.lang!}
							pid={phrase.id!}
							className="ms-auto"
						/>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	)
}
