import { memo, type ReactElement } from 'react'
import { useDebounce } from '@uidotdev/usehooks'

import type { pids } from '@/types/main'
import { useLanguagePhrasesSearch } from '@/hooks/use-language'
import { PhraseFullFilteredType } from '@/lib/schemas'

import { Accordion } from '@/components/ui/accordion'
import Callout from '@/components/ui/callout'
import { Loader } from '@/components/ui/loader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PhraseAccordionItem } from '@/components/phrase-accordion-item'

export const DisplayPhrasesQuery = memo(DisplayPhrasesQueryComponent)

type DisplayPhrasesQueryType = {
	lang?: string
	text?: string
	tags?: string[] | null
	filteredPids?: pids | null
	renderItem?: (phrase: PhraseFullFilteredType) => ReactElement
}
function DisplayPhrasesQueryComponent({
	lang,
	text,
	tags,
	filteredPids,
	renderItem,
}: DisplayPhrasesQueryType) {
	const debouncedText = useDebounce(text, 300)
	const { data: phrasesData, isLoading } = useLanguagePhrasesSearch(
		lang,
		debouncedText,
		tags,
		filteredPids
	)
	return renderItem ?
			<ScrollArea className="flex-1">
				<div className="flex min-h-20 flex-1 flex-col place-content-center gap-2">
					{isLoading ?
						<Loader />
					: !text ?
						<Callout variant="ghost">Enter search terms above</Callout>
					:	phrasesData?.length === 0 && (
							<Callout variant="ghost">No phrases found.</Callout>
						)
					}
					{phrasesData?.map(renderItem)}
				</div>
			</ScrollArea>
		:	<>
				<p className="text-muted-foreground pb-2 text-right text-xs italic">
					{phrasesData?.length ?? 0} results
				</p>
				<Accordion type="single" collapsible className="w-full">
					{phrasesData?.map((phrase) => (
						<PhraseAccordionItem key={phrase.id} phrase={phrase} />
					))}
				</Accordion>
			</>
}

/*
function Empty() {
	return (
		<div className="text-muted-foreground flex w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12">
			<SearchX className="size-12" />
			<div className="text-center">
				<p className="font-semibold">No phrases match your filters.</p>
				<p className="text-sm">Try adjusting your search.</p>
			</div>
		</div>
	)
}
*/
