import { useState } from 'react'
import { ChevronsUpDown, Loader } from 'lucide-react'
import { Badge, LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import Callout from '@/components/ui/callout'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'

import type { OnePhraseComponentProps, TranslationStub } from '@/types/main'
import languages from '@/lib/languages'
import { AddTranslationsDialog } from '@/components/add-translations-dialog'
import { AddTags } from '@/components/add-tags'
import { CardStatusDropdown } from '@/components/card-status-dropdown'
import CopyLinkButton from '@/components/copy-link-button'
import SharePhraseButton from '@/components/share-phrase-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { usePhrase } from '@/hooks/composite-phrase'
import { SendPhraseToFriendButton } from '@/components/send-phrase-to-friend-button'
import { avatarUrlify, cn } from '@/lib/utils'
import { DestructiveOctagon } from '@/components/ui/destructive-octagon-badge'
import UserPermalink from '../user-permalink'
import { ago } from '@/lib/dayjs'

export function BigPhraseCard({ pid, lang }: OnePhraseComponentProps) {
	const { data: phrase, status } = usePhrase(pid, lang)
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
			{phrase.added_by ?
				<div className="mb-3 flex flex-row gap-1 px-2">
					Phrase by{' '}
					<UserPermalink
						uid={phrase.added_by}
						username={phrase.added_by_profile.username}
						avatarUrl={avatarUrlify(phrase.added_by_profile.avatar_path)}
					/>
					{' • '}
					{ago(phrase.created_at)}
				</div>
			:	null}
			<Card className="@container">
				<CardHeader>
					<div className="flex flex-col items-start gap-2">
						<div className="flex w-full flex-row items-start justify-between gap-2">
							<LangBadge lang={lang} />
							<CardStatusDropdown pid={pid} lang={lang} />
						</div>
						<CardTitle className="space-x-1 text-2xl">
							<span>&ldquo;{phrase.text}&rdquo;</span>
						</CardTitle>
					</div>
				</CardHeader>

				<CardContent>
					<div className="space-y-6">
						<Separator />
						<div>
							<div className="space-y-3">
								<div className="flex flex-row items-center justify-between">
									<div className="flex flex-row items-baseline gap-2">
										<h3 className="text-lg font-semibold">Translations</h3>
										{trans.length ? null : (
											<span className="text-muted-foreground italic">
												No tags
											</span>
										)}
									</div>
									<AddTranslationsDialog
										phrase={phrase}
										variant="outline"
										size="sm"
									/>
								</div>
								{trans?.map((translation) => (
									<div
										key={translation.id}
										className="flex flex-row items-baseline justify-start gap-2 space-y-2 rounded"
									>
										<LangBadge lang={translation.lang} />
										<p className="text-md">{translation.text}</p>
									</div>
								))}
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
								<div className="inline-flex flex-row flex-wrap items-baseline gap-2">
									<h3 className="text-lg font-semibold">Tags</h3>
									{tags.map((tag: { id: string; name: string }) => (
										<Badge key={tag.id} variant="secondary">
											{tag.name}
										</Badge>
									))}
									{!tags.length && (
										<span className="text-muted-foreground italic">
											No tags
										</span>
									)}
								</div>
								<AddTags phraseId={pid} lang={lang} />
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
			<div className="flex w-full flex-grow flex-row flex-wrap gap-4 px-2 py-3 @md:place-content-evenly">
				<CopyLinkButton
					url={`${window.location.host}/learn/${lang}/${pid}`}
					variant="outline"
					size="default"
				/>
				<SharePhraseButton
					pid={pid}
					lang={lang}
					variant="outline"
					size="default"
				/>
				<SendPhraseToFriendButton
					pid={pid}
					lang={lang}
					variant="outline"
					size="default"
				/>
			</div>
		</div>
	)
}

function PhraseNotFound() {
	return (
		<Callout variant="problem" Icon={DestructiveOctagon}>
			<p>We couldn't find that phrase. Please check your link and try again.</p>
		</Callout>
	)
}
