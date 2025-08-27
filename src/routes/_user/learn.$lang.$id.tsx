import { AddTranslationsDialog } from '@/components/add-translations-dialog'
import { AddTags } from '@/components/add-tags'
import { CardStatusDropdown } from '@/components/card-status-dropdown'
import Flagged from '@/components/flagged'
import CopyLinkButton from '@/components/copy-link-button'
import SharePhraseButton from '@/components/share-phrase-button'
import { Badge } from '@/components/ui/badge'
import Callout from '@/components/ui/callout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import languages from '@/lib/languages'
import { useDeckCard } from '@/lib/use-deck'
import { useLanguagePhrase } from '@/lib/use-language'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Calendar, ChevronsUpDown, OctagonMinus, Pencil, X } from 'lucide-react'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'
import { roundAndTrim } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const DestructiveOctagon = () => (
	<Badge variant="destructive" className="p-2">
		<OctagonMinus />
	</Badge>
)

function PhraseNotFound() {
	return (
		<Callout variant="problem" Icon={DestructiveOctagon}>
			<p>We couldn't find that phrase. Please check your link and try again.</p>
		</Callout>
	)
}

export const Route = createFileRoute('/_user/learn/$lang/$id')({
	component: RouteComponent,
})

function RouteComponent() {
	const { lang, id } = Route.useParams()
	const [isTagEditing, setIsTagEditing] = useState(false)
	const { data: phrase } = useLanguagePhrase(id, lang)
	const { data: card } = useDeckCard(id, lang)
	const { phrasesMapFiltered } = useDeckPidsAndRecs(lang)
	const [isOpen, setIsOpen] = useState(false)

	if (!phrase) return <PhraseNotFound />

	const translations_mine =
		phrasesMapFiltered[id].translations_mine ?? phrase.translations
	const translations_other = phrasesMapFiltered[id].translations_other ?? []
	const tags = phrase.tags ?? []

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CardTitle className="text-2xl">{phrase.text}</CardTitle>
						<Badge variant="outline" className="ml-2">
							{languages[lang]}
						</Badge>
					</div>
					<CardStatusDropdown pid={id} lang={lang} button />
				</div>
				<div className="text-muted-foreground static mt-2 block items-center gap-2 text-sm">
					{!card ?
						<span>This card is not in your deck</span>
					: !card?.difficulty ?
						<span>You haven't reviewed this card before</span>
					:	<>
							<span>Difficulty: {roundAndTrim(card.difficulty, 1)} / 10</span>
							<Flagged
								className="flex flex-row items-center gap-1"
								name="cards_schedule_metadata"
							>
								<span className="mx-2">•</span>
								<Calendar className="h-4 w-4" />
								<span>
									Next review scheduled for{' '}
									{card?.nextReview?.day ?? '"unknown"'} (in{' '}
									{card?.nextReview?.daysFromNow ?? '4'} days)
								</span>
							</Flagged>
						</>
					}
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					<div>
						<h3 className="mb-3 text-lg font-medium">Translations</h3>
						<div className="space-y-3">
							{translations_mine.map((translation) => (
								<div key={translation.id} className="bg-muted rounded p-3">
									<div className="flex items-center justify-between">
										<p className="text-md">{translation.text}</p>
										<Badge variant="outline">
											{languages[translation.lang]}
										</Badge>
									</div>
								</div>
							))}
						</div>
						{translations_other.length === 0 ? null : (
							<Collapsible open={isOpen} onOpenChange={setIsOpen}>
								<CollapsibleTrigger
									className={buttonVariants({ variant: 'link', size: 'sm' })}
								>
									<ChevronsUpDown className="h-4 w-4" />
									{isOpen ? 'Hide extra' : 'Show hidden'} translations
								</CollapsibleTrigger>
								<CollapsibleContent className="space-y-3">
									{translations_other.map((translation) => (
										<div
											key={translation.id}
											className="bg-muted rounded-lg p-3"
										>
											<div className="flex items-center justify-between">
												<p className="text-md">{translation.text}</p>
												<Badge variant="outline">
													{languages[translation.lang]}
												</Badge>
											</div>
										</div>
									))}
								</CollapsibleContent>
							</Collapsible>
						)}
						<AddTranslationsDialog
							phrase={phrase}
							variant="outline"
							className="mt-3"
						/>
					</div>

					<Separator />

					<div
						className={`transition-all ${isTagEditing ? `bg-primary/5 rounded-2xl` : ''}`}
					>
						<div className="mb-3 flex flex-row items-center justify-between">
							<h3 className="text-lg font-medium">Tags</h3>
							<Button
								variant="outline"
								size="sm"
								className="grid grid-cols-1 grid-rows-1 place-items-center [grid-template-areas:'stack']"
								onClick={() => setIsTagEditing(!isTagEditing)}
							>
								<span
									className={`${!isTagEditing ? 'invisible' : ''} col-span-1 row-span-1 flex flex-row items-center gap-1 [grid-area:stack]`}
								>
									<X />
									Cancel
								</span>
								<span
									className={`${isTagEditing ? 'invisible' : ''} col-span-1 row-span-1 flex flex-row items-center gap-1 [grid-area:stack]`}
								>
									<Pencil />
									Edit tags
								</span>
							</Button>
						</div>
						<div className="mb-2 flex flex-wrap gap-2">
							{tags.map((tag: { id: string; name: string }) => (
								<Badge key={tag.id} variant="secondary">
									{tag.name}
								</Badge>
							))}
						</div>
						{isTagEditing && (
							<AddTags
								onSuccess={() => setIsTagEditing(false)}
								phraseId={id}
								lang={lang}
							/>
						)}
					</div>

					<Separator />

					<div className="flex flex-wrap place-items-center justify-between">
						<CopyLinkButton variant="outline" size="default" />
						<SharePhraseButton
							pid={id}
							lang={lang}
							variant="outline"
							size="default"
						/>

						<Link
							to={`/learn/$lang/library`}
							params={{ lang }}
							className={buttonVariants({ variant: 'secondary' })}
						>
							Back to library
						</Link>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
