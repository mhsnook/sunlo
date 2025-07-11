import { CardFull, PhraseFiltered, pids } from '@/types/main'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { CardStatusDropdown } from './card-status-dropdown'
import { AddTranslationsDialog } from './add-translations-dialog'
import { useDeck } from '@/lib/use-deck'
import PhraseExtraInfo from './phrase-extra-info'
import PermalinkButton from './permalink-button'
import SharePhraseButton from './share-phrase-button'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { useProfile } from '@/lib/use-profile'
import { useMemo } from 'react'

interface PhrasesWithOptionalOrder {
	lang: string
	pids?: pids | null
}

export function LanguagePhrasesAccordionComponent({
	lang,
	pids = null,
}: PhrasesWithOptionalOrder) {
	const { data: deck } = useDeck(lang)
	// we are using filtered phrases but unfiltered pids
	// because the user will manage filtering
	const { phrasesMapFiltered, language: languagePids } =
		useDeckPidsAndRecs(lang)

	const pidsToUse = pids ?? languagePids

	return (
		<Accordion type="single" collapsible className="w-full">
			{pidsToUse.map((pid) => (
				<PhraseAccordionItem
					key={pid}
					phrase={phrasesMapFiltered[pid]}
					card={deck?.cardsMap[pid] ?? null}
				/>
			))}
		</Accordion>
	)
}

function PhraseAccordionItem({
	phrase,
	card,
}: {
	phrase: PhraseFiltered
	card: CardFull | null
}) {
	const { data: profile } = useProfile()
	const params = useMemo(
		() => ({ lang: phrase.lang!, id: phrase.id! }),
		[phrase.id, phrase.lang]
	)
	return (
		<AccordionItem value={phrase.id!} className="mb-2 rounded border px-2">
			<div className="flex flex-row items-center gap-2">
				<CardStatusDropdown
					lang={phrase.lang!}
					deckPresent={profile?.deckLanguages?.includes(phrase.lang!) ?? false}
					pid={phrase.id!}
					card={card}
				/>
				<AccordionTrigger>{phrase.text}</AccordionTrigger>
			</div>
			<AccordionContent>
				<div className="space-y-1 pt-2 pl-6">
					<p className="text-sm text-gray-500">Translations</p>
					<ul className="space-y-1">
						{phrase.translations_mine?.map((translation) => (
							<li key={translation.id} className="flex items-center">
								<span className="mr-2 rounded-md bg-gray-200 px-2 py-1 text-xs text-gray-700">
									{translation.lang}
								</span>
								<span className="text-sm">{translation.text}</span>
							</li>
						))}
					</ul>
					<div className="my-4 flex flex-row gap-2">
						<AddTranslationsDialog
							phrase={phrase}
							size="badge"
							variant="link"
							className="text-xs"
						/>
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
