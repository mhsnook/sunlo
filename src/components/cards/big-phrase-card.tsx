import { CSSProperties, useState } from 'react'
import { ChevronsUpDown, MessagesSquare } from 'lucide-react'
import { Badge, LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import Callout from '@/components/ui/callout'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'

import type { uuid } from '@/types/main'
import languages from '@/lib/languages'
import { AddTranslationsDialog } from '@/components/card-pieces/add-translations'
import { AddTags } from '@/components/card-pieces/add-tags'
import { CardStatusDropdown } from '@/components/card-pieces/card-status-dropdown'
import CopyLinkButton from '@/components/copy-link-button'
import SharePhraseButton from '@/components/card-pieces/share-phrase-button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { usePhrase } from '@/hooks/composite-phrase'
import { SendPhraseToFriendButton } from '@/components/card-pieces/send-phrase-to-friend'
import { cn } from '@/lib/utils'
import { DestructiveOctagon } from '@/components/ui/destructive-octagon-badge'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Loader } from '@/components/ui/loader'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { Button } from '@/components/ui/button'
import Flagged from '@/components/flagged'

export function BigPhraseCard({ pid }: { pid: uuid }) {
	const { data: phrase, status } = usePhrase(pid)
	const [isOpen, setIsOpen] = useState(false)

	if (status === 'pending') return <Loader />
	if (status === 'not-found' || !phrase) return <PhraseNotFound />

	return (
		<div>
			{phrase.added_by ?
				<div className="mb-3 flex flex-row gap-1 px-2">
					<UidPermalink uid={phrase.added_by} timeValue={phrase.created_at} />
				</div>
			:	null}
			<CardlikeFlashcard
				className="@container"
				// oxlint-disable-next-line jsx-no-new-object-as-prop
				style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
			>
				<CardHeader>
					<div className="flex flex-col items-start gap-2">
						<div className="flex w-full flex-row items-start justify-between gap-2">
							<LangBadge lang={phrase.lang} />
							<CardStatusDropdown phrase={phrase} />
						</div>
						<CardTitle className="space-x-1 text-2xl">
							<span
								style={
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									{ viewTransitionName: `phrase-text-${pid}` } as CSSProperties
								}
							>
								&ldquo;{phrase.text}&rdquo;
							</span>
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
										{phrase.translations_mine?.length ? null : (
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
								{phrase.translations_mine?.map((trans) => (
									<div
										key={trans.id}
										className="flex flex-row items-baseline justify-start gap-2 space-y-2 rounded"
									>
										<LangBadge lang={trans.lang} />
										<p className="text-md">{trans.text}</p>
									</div>
								))}
							</div>
							{!phrase.translations_other.length ? null : (
								<Collapsible open={isOpen} onOpenChange={setIsOpen}>
									<CollapsibleTrigger
										className={cn(
											buttonVariants({ variant: 'outline', size: 'sm' }),
											isOpen ? 'my-3' : 'mt-3'
										)}
									>
										<ChevronsUpDown className="h-4 w-4" />
										{isOpen ?
											'Hide extra'
										:	`Show ${phrase.translations_other.length} hidden`}{' '}
										translation{phrase.translations_other.length > 0 ? 's' : ''}
									</CollapsibleTrigger>
									<CollapsibleContent className="space-y-3">
										{phrase.translations_other.map((trans) => (
											<div key={trans.id} className="bg-muted rounded-lg p-3">
												<div className="flex items-center justify-between">
													<p className="text-md">{trans.text}</p>
													<Badge variant="outline">
														{languages[trans.lang]}
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
									{phrase.tags?.map((tag: { id: string; name: string }) => (
										<Badge key={tag.id} variant="secondary">
											{tag.name}
										</Badge>
									))}
									{!phrase.tags?.length && (
										<span className="text-muted-foreground italic">
											No tags
										</span>
									)}
								</div>
								<AddTags phrase={phrase} />
							</div>
						</div>
					</div>
				</CardContent>
			</CardlikeFlashcard>
			<div className="flex w-full flex-row flex-wrap gap-4 px-2 py-3 @md:place-content-evenly">
				<Flagged>
					<Button>
						<MessagesSquare /> Discuss
					</Button>
				</Flagged>
				<CopyLinkButton
					url={`${window.location.host}/learn/${phrase.lang}/phrases/${pid}`}
					variant="outline"
					size="default"
				/>
				<SharePhraseButton phrase={phrase} variant="outline" size="default" />
				<SendPhraseToFriendButton
					phrase={phrase}
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
