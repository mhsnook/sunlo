import { type CSSProperties, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
	ChevronsUpDown,
	MessagesSquare,
	ListMusic,
	Users,
	Edit,
	Trash2,
	RefreshCcwDot,
} from 'lucide-react'

import type { uuid } from '@/types/main'
import { Badge, LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import {
	UidPermalink,
	UidPermalinkInline,
} from '@/components/card-pieces/user-permalink'
import { Loader } from '@/components/ui/loader'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { Button } from '@/components/ui/button'
import {
	usePhraseProvenance,
	type PhraseProvenanceItem as PhraseProvenanceItemType,
} from '@/hooks/use-language'
import { PlaylistEmbed } from '@/components/playlists/playlist-embed'
import Flagged from '@/components/flagged'
import { ago } from '@/lib/dayjs'

export function BigPhraseCard({ pid }: { pid: uuid }) {
	const { data: phrase, status } = usePhrase(pid)
	const [isOpen, setIsOpen] = useState(false)
	const [showAllProvenance, setShowAllProvenance] = useState(false)
	const provenanceItems = usePhraseProvenance(pid)

	if (status === 'pending') return <Loader />
	if (status === 'not-found' || !phrase) return <PhraseNotFound />

	const displayedProvenance =
		showAllProvenance ? provenanceItems : provenanceItems.slice(0, 5)
	const hasMore = provenanceItems.length > 5

	return (
		<div>
			<div className="mb-3 flex flex-row items-center justify-between gap-1 px-2">
				<UidPermalink uid={phrase.added_by!} timeValue={phrase.created_at} />
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="gap-1">
						<Users className="h-3 w-3" />
						{phrase.count_learners}
					</Badge>

					<CardStatusDropdown phrase={phrase} />
				</div>
			</div>

			<CardlikeFlashcard
				className="@container"
				style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
			>
				<CardHeader>
					<div className="flex flex-col items-start gap-2">
						<div className="flex w-full flex-row items-start justify-between gap-2">
							<div className="flex flex-row items-center gap-2">
								<LangBadge lang={phrase.lang} />
								{phrase.only_reverse && (
									<Badge variant="outline" className="gap-1">
										<RefreshCcwDot className="h-3 w-3" />
										Reverse only
									</Badge>
								)}
							</div>
							<div className="flex flex-row items-center gap-2">
								<Flagged>
									<Button size="icon" variant="ghost">
										<Trash2 />
									</Button>
									<Button size="icon" variant="ghost">
										<Edit />
									</Button>
								</Flagged>
							</div>
						</div>
						<CardTitle className="space-x-1 text-2xl">
							<span
								style={
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
										variant="ghost"
										size="icon"
									/>
								</div>
								{phrase.translations_mine
									?.filter((t) => !t.archived)
									.map((trans) => (
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

						<div className="flex items-center justify-between">
							<div className="inline-flex flex-row flex-wrap items-baseline gap-2">
								<h3 className="text-lg font-semibold">Tags</h3>
								{phrase.tags?.map((tag: { id: string; name: string }) => (
									<Badge key={tag.id} variant="secondary">
										{tag.name}
									</Badge>
								))}
								{!phrase.tags?.length && (
									<span className="text-muted-foreground italic">No tags</span>
								)}
							</div>
							<AddTags phrase={phrase} />
						</div>
						<Separator />
						<div className="flex flex-row items-center gap-2">
							<div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
								<span title="Shows the average difficulty for this phrase across all learners">
									Difficulty:{' '}
									{!phrase.avg_difficulty ?
										'unknown'
									:	<span>
											<span className="font-bold">
												{phrase.avg_difficulty?.toFixed(1) ?? '?'}
											</span>{' '}
											/ 10
										</span>
									}
								</span>
								<span>•</span>
								<span className={phrase.count_learners ? 'font-bold' : ''}>
									{phrase.count_learners} learner
									{phrase.count_learners === 1 ? '' : 's'}
								</span>
								{phrase.card?.last_reviewed_at ?
									<>
										<span>•</span>
										<span>
											Your last review:{' '}
											<span className="font-bold">
												{ago(phrase.card.last_reviewed_at)}
											</span>
										</span>
									</>
								:	null}
							</div>
						</div>
					</div>
				</CardContent>
			</CardlikeFlashcard>
			<div className="flex w-full flex-row flex-wrap justify-start gap-4 px-2 py-3">
				<CopyLinkButton
					url={`${window.location.host}/learn/${phrase.lang}/phrases/${pid}`}
					variant="outline"
					size="icon"
					text=""
				/>
				<SharePhraseButton
					text=""
					phrase={phrase}
					variant="outline"
					size="icon"
				/>
				<SendPhraseToFriendButton
					phrase={phrase}
					variant="outline"
					text=""
					size="icon"
				/>
			</div>
			{/* Provenance section */}
			{provenanceItems.length > 0 && (
				<>
					<Separator />
					<div className="mt-4 space-y-3">
						<h3 className="h3 mb-1">
							Found in {provenanceItems.length}{' '}
							{provenanceItems.length === 1 ? 'place' : 'places'}
						</h3>
						<div className="space-y-2">
							{displayedProvenance.map((item) => (
								<PhraseProvenanceItem
									key={item.id}
									item={item}
									lang={phrase.lang}
								/>
							))}
						</div>
						{hasMore && !showAllProvenance && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowAllProvenance(true)}
							>
								Show {provenanceItems.length - 5} more
							</Button>
						)}
					</div>
				</>
			)}
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

interface PhraseProvenanceItemProps {
	item: PhraseProvenanceItemType
	lang: string
}

function PhraseProvenanceItem({ item, lang }: PhraseProvenanceItemProps) {
	if (item.type === 'playlist') {
		return (
			<div className="bg-muted/50 space-y-2 rounded-lg p-3">
				<div className="flex items-start gap-2">
					<ListMusic className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
					<div className="inline min-w-0 flex-1">
						<span>Playlist: </span>
						<Link
							to="/learn/$lang/playlists/$playlistId"
							params={{ lang, playlistId: item.playlistId }}
							className="s-link font-medium"
						>
							{item.title}
						</Link>
						{item.description && (
							<p className="text-muted-foreground mt-1 text-sm">
								{item.description}
							</p>
						)}
						<div className="mt-2">
							<UidPermalinkInline uid={item.uid} timeValue={item.created_at} />
						</div>
						{item.href && (
							<div className="mt-2">
								<PlaylistEmbed href={item.href} />
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}

	// Comment type
	return (
		<div className="bg-muted/50 space-y-2 rounded-lg p-3">
			<div className="flex items-start gap-2">
				<MessagesSquare className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
				<div className="inline min-w-0 flex-1">
					<span>Thread: </span>
					<Link
						to="/learn/$lang/requests/$id"
						params={{ lang, id: item.requestId }}
						hash={`#comment-${item.commentId}`}
						className="s-link font-medium"
					>
						{item.prompt}
					</Link>
					<div className="mt-2">
						<UidPermalinkInline uid={item.uid} timeValue={item.created_at} />
					</div>
				</div>
			</div>
		</div>
	)
}
