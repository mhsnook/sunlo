import { PhraseRequestType, PublicProfileType } from '@/lib/schemas'
import { CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import UserPermalink from './user-permalink'
import { LangBadge } from '@/components/ui/badge'
import Flagged from '@/components/flagged'
import { Heart, MessagesSquare, Repeat, Send, WalletCards } from 'lucide-react'
import { Link, useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import CopyLinkButton from '@/components/copy-link-button'
import { ShareRequestButton } from './share-request-button'
import { SendRequestToFriendDialog } from './send-request-to-friend'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'

export function RequestHeader({
	request,
	profile,
}: {
	request: PhraseRequestType
	profile: undefined | PublicProfileType
}) {
	return (
		<CardHeader className="border-primary-foresoft/20 mb-6 border-b">
			<div className="flex flex-row items-center justify-between gap-2">
				{profile && (
					<UserPermalink
						username={profile.username}
						avatar_path={profile.avatar_path}
						uid={request.requester_uid}
						timeLinkTo="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						timeLinkParams={{ lang: request.lang, id: request.id }}
						timeValue={request.created_at}
					/>
				)}
				<div className="flex flex-row items-center gap-2">
					<Flagged>
						<Button variant="ghost" size="icon">
							<Repeat />
						</Button>
					</Flagged>
					<LangBadge lang={request.lang} />
				</div>
			</div>
			<CardDescription className="sr-only">
				A request for assistance, and a comments thread for other users to
				discuss and answer with comments, flash card recommendations, or both.
			</CardDescription>
		</CardHeader>
	)
}

export function RequestFooter({
	request,
	answersCount,
	commentsCount,
}: {
	request: PhraseRequestType
	answersCount: number
	commentsCount: number
}) {
	const shareUrl = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`
	const search = useSearch({ strict: false })
	return (
		<CardFooter className="flex items-center justify-between">
			<div className="text-muted-foreground flex items-center gap-4 text-sm">
				<Flagged name="phrase_request_likes" className="hidden">
					<div className="flex items-center gap-2">
						<Heart className="h-4 w-4 text-red-500" />
						<span className="text-foreground font-medium">
							{/*request.popularityCount*/} 4
						</span>
						<span>others want to know this</span>
					</div>
				</Flagged>
				<div className="flex flex-row gap-2">
					<Link
						to="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: request.lang, id: request.id }}
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						search={{
							show: search.show === 'thread' ? 'request-only' : 'thread',
						}}
						className={cn(
							buttonVariants({ size: 'sm', variant: 'outline-accent' })
						)}
					>
						<MessagesSquare /> {search.show === 'thread' ? 'Hide' : 'Show'}{' '}
						comments ({commentsCount})
					</Link>
					{answersCount ?
						<Link
							to="/learn/$lang/requests/$id"
							// oxlint-disable-next-line jsx-no-new-object-as-prop
							params={{ lang: request.lang, id: request.id }}
							// oxlint-disable-next-line jsx-no-new-object-as-prop
							search={{
								show:
									search.show === 'answers-only' ? 'thread' : 'answers-only',
							}}
							className="s-link-hidden text-muted-foreground flex items-center gap-2 text-sm"
						>
							<WalletCards className="h-4 w-4" />
							<span>
								{search.show === 'answers-only' ?
									'Show all comments'
								:	`Show ${answersCount} answer${answersCount !== 1 ? 's' : ''}`}
							</span>
						</Link>
					:	null}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<CopyLinkButton url={shareUrl} text="" size="icon" />
				<ShareRequestButton
					id={request.id}
					lang={request.lang}
					variant="ghost"
					size="icon"
				/>
				<SendRequestToFriendDialog lang={request.lang} id={request.id}>
					<Button title="share in chat" size="icon" variant="ghost">
						<Send />
					</Button>
				</SendRequestToFriendDialog>
			</div>
		</CardFooter>
	)
}
