import { Link } from '@tanstack/react-router'
import { Heart, MessagesSquare, Send, WalletCards } from 'lucide-react'

import { LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import UserPermalink from '@/components/user-permalink'
import CopyLinkButton from '@/components/copy-link-button'
import Flagged from '@/components/flagged'
import { Button } from '@/components/ui/button'
import { SendRequestToFriendDialog } from '@/components/send-request-to-friend-dialog'
import { ShareRequestButton } from '@/components/share-request-button'
import { PhraseRequestType } from '@/lib/schemas'
import { useRequestAnswers } from '@/hooks/use-language'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { CardContent, CardFooter, CardHeader } from '../ui/card'
import { PhraseTinyCard } from '../cards/phrase-tiny-card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Markdown } from '@/components/my-markdown'
import { CardlikeRequest } from '@/components/ui/card-like'

export function RequestItem({ request }: { request: PhraseRequestType }) {
	const { data: answers } = useRequestAnswers(request.id)
	const { data: requester } = useOnePublicProfile(request.requester_uid)
	if (!request) return null
	const shareUrl = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`
	return (
		<CardlikeRequest className="group mb-6">
			<CardHeader className="border-primary-foresoft/20 mx-6 mb-6 border-b px-0">
				<div className="flex flex-row items-center justify-between gap-2">
					{requester && (
						<UserPermalink
							username={requester.username}
							avatar_path={requester.avatar_path}
							uid={request.requester_uid}
							timeLinkTo="/learn/$lang/requests/$id"
							// oxlint-disable-next-line jsx-no-new-object-as-prop
							timeLinkParams={{ lang: request.lang, id: request.id }}
							timeValue={request.created_at}
						/>
					)}

					<LangBadge lang={request.lang} />
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-lg">
					<Markdown>{request.prompt}</Markdown>
				</div>

				<p className="text-muted-foreground mt-4 text-sm">
					{answers?.length || 'No'} answers {answers?.length ? '' : 'yet'}
				</p>
				<ScrollArea className="flex w-full flex-row justify-start gap-2">
					<div className="flex w-full flex-row justify-start gap-2">
						{answers?.map((p) => <PhraseTinyCard key={p.id} pid={p.id} />)}
					</div>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</CardContent>
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
							className={cn(
								buttonVariants({ size: 'sm', variant: 'outline-accent' })
							)}
						>
							<MessagesSquare /> Discussion
						</Link>
						<Link
							to="/learn/$lang/requests/$id"
							// oxlint-disable-next-line jsx-no-new-object-as-prop
							params={{ lang: request.lang, id: request.id }}
							className="s-link-hidden text-muted-foreground flex items-center gap-2 text-sm"
						>
							<WalletCards className="h-4 w-4" />
							<span>
								{answers?.length ?? 0}{' '}
								{answers?.length === 1 ? 'answer' : 'answers'}
							</span>
						</Link>
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
		</CardlikeRequest>
	)
}
