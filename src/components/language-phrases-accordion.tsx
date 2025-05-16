import { CardFull, PhraseFiltered, pids, uuid } from '@/types/main'
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
	if (!deck)
		throw new Error(
			"We can't find that language. Are you sure you have the correct URL?"
		)
	const pidsToUse = pids ?? languagePids
	return (
		<Accordion type="single" collapsible className="w-full">
			{pidsToUse.map((pid) => (
				<PhraseAccordionItem
					key={pid}
					phrase={phrasesMapFiltered[pid]}
					card={deck?.cardsMap[pid] ?? null}
					deckId={deck?.meta.id}
				/>
			))}
		</Accordion>
	)
}

function PhraseAccordionItem({
	phrase,
	card,
	deckId,
}: {
	phrase: PhraseFiltered
	card: CardFull | null
	deckId: uuid | null
}) {
	return (
		<AccordionItem value={phrase.id!} className="mb-2 rounded border px-2">
			<div className="flex flex-row items-center gap-2">
				<CardStatusDropdown
					lang={phrase.lang!}
					deckId={deckId}
					pid={phrase.id!}
					card={card}
				/>
				<AccordionTrigger>{phrase.text}</AccordionTrigger>
			</div>
			<AccordionContent>
				<div className="space-y-1 pt-2 pl-6">
					<p className="text-sm text-gray-500">Translations</p>
					<ul className="space-y-1">
						{phrase.translations_mine?.map((translation, index) => (
							<li key={index} className="flex items-center">
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
							params={{ lang: phrase.lang!, id: phrase.id! }}
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
