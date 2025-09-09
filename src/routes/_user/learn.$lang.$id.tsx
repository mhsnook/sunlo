import { AddTranslationsDialog } from '@/components/add-translations-dialog'
import { AddTags } from '@/components/add-tags'
import { CardStatusDropdown } from '@/components/card-status-dropdown'
import CopyLinkButton from '@/components/copy-link-button'
import SharePhraseButton from '@/components/share-phrase-button'
import { Badge, LangBadge } from '@/components/ui/badge'
import Callout from '@/components/ui/callout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import languages from '@/lib/languages'
import { usePhrase } from '@/hooks/composite-phrase'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronsUpDown, OctagonMinus, Loader } from 'lucide-react'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useState } from 'react'
import { SendPhraseToFriendButton } from '@/components/send-phrase-to-friend-button'
import { cn } from '@/lib/utils'
import { TranslationStub } from '@/types/main'
import { buttonVariants } from '@/components/ui/button-variants'

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
	const { data: phrase, status } = usePhrase(id, lang)
	const [isOpen, setIsOpen] = useState(false)

	if (status === 'pending') return <Loader />
	if (status === 'not-found' || !phrase) return <PhraseNotFound />

	// Tell the component what to do with incomplete composite data.
	const [trans, other] =
		!phrase.translations_mine ?
			[phrase.translations, []]
		:	[phrase.translations_mine, phrase.translations_other ?? []]

	const tags = phrase.tags ?? []

	return (
		<div>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex flex-col items-start gap-2">
							<div className="flex flex-row items-center gap-2">
								<LangBadge lang={lang} />
								<CardStatusDropdown pid={id} lang={lang} />
							</div>
							<CardTitle className="space-x-1 text-2xl">
								<span>&ldquo;{phrase.text}&rdquo;</span>
							</CardTitle>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					<div className="space-y-6">
						<Separator />
						<div>
							<div className="space-y-3">
								{trans?.map((translation) => (
									<div
										key={translation.id}
										className="flex flex-row items-center justify-start gap-2 space-y-2 rounded"
									>
										<LangBadge lang={translation.lang} />
										<p className="text-md">{translation.text}</p>
									</div>
								))}
								<AddTranslationsDialog
									phrase={phrase}
									variant="outline"
									size="sm"
								/>
							</div>
							{!other.length ? null : (
								<Collapsible open={isOpen} onOpenChange={setIsOpen}>
									<CollapsibleTrigger
										className={cn(
											buttonVariants({ variant: 'outline', size: 'sm' }),
											isOpen ? 'my-3' : 'mt-3'
										)}
									>
										<ChevronsUpDown className="h-4 w-4" />
										{isOpen ? 'Hide extra' : `Show ${other.length} hidden`}{' '}
										translation{other.length > 0 ? 's' : ''}
									</CollapsibleTrigger>
									<CollapsibleContent className="space-y-3">
										{other.map((translation: TranslationStub) => (
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
						</div>

						<Separator />

						<div>
							<div className="flex items-center justify-between">
								<div className="inline-flex flex-row flex-wrap items-center gap-2">
									<h3 className="text-lg font-semibold">Tags</h3>
									{tags.map((tag: { id: string; name: string }) => (
										<Badge key={tag.id} variant="secondary">
											{tag.name}
										</Badge>
									))}
									{!tags.length && (
										<p className="text-muted-foreground italic">No tags</p>
									)}
								</div>
								<AddTags phraseId={id} lang={lang} />
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
			<div className="grid w-full flex-grow grid-cols-3 justify-stretch gap-4 px-2 py-3">
				<CopyLinkButton variant="outline" size="default" />
				<SharePhraseButton
					pid={id}
					lang={lang}
					variant="outline"
					size="default"
				/>
				<SendPhraseToFriendButton
					pid={id}
					lang={lang}
					variant="outline"
					size="default"
				/>
			</div>
		</div>
	)
}
