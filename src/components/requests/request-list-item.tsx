import { Link } from '@tanstack/react-router'
import { CheckCircle, Clock, Heart, MessageSquare, Send } from 'lucide-react'

import { PublicProfile } from '@/routes/_user/friends/-types'
import { Badge, LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ago } from '@/lib/dayjs'
import UserPermalink from '@/components/user-permalink'
import CopyLinkButton from '@/components/copy-link-button'
import type { PhraseRequestFull } from '@/hooks/use-requests'
import Flagged from '@/components/flagged'
import { Blockquote } from '@/components/ui/blockquote'
import { Button } from '@/components/ui/button'
import { SendRequestToFriendDialog } from '@/components/send-request-to-friend-dialog'
import { ShareRequestButton } from '@/components/share-request-button'

export function RequestItem({ request }: { request: PhraseRequestFull }) {
	if (!request) return null
	const answers = Array.isArray(request.phrases) ? request.phrases : []
	const shareUrl = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`
	const requester = (request.requester as PublicProfile) ?? null
	return (
		<Card className="group border-border/50 hover:border-border transition-all duration-200 hover:shadow-md">
			<CardHeader>
				<div className="flex flex-row items-center justify-between gap-2">
					<LangBadge lang={request.lang} />
					<Badge
						variant={request.status === 'fulfilled' ? 'success' : 'secondary'}
					>
						{request.status === 'pending' ?
							<Clock size={12} />
						:	<CheckCircle size={12} />}
						<span className="capitalize">{request.status}</span>
					</Badge>
				</div>
				<div className="text-muted-foreground mt-2 inline-flex min-w-0 items-center gap-1 text-sm">
					Requested{' '}
					<Link
						to="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: request.lang!, id: request.id! }}
						className="s-link-hidden text-primary-foresoft"
					>
						{ago(request.created_at)}
					</Link>{' '}
					by{' '}
					<UserPermalink
						username={requester.username ?? ''}
						avatar_path={requester.avatar_path}
						uid={request.requester_uid}
						className="text-muted-foreground"
					/>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<Blockquote>&ldquo;{request.prompt}&rdquo;</Blockquote>

					<Link
						to="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: request.lang!, id: request.id! }}
						className="s-link-hidden text-muted-foreground flex items-center gap-2 text-sm"
					>
						<MessageSquare className="h-4 w-4" />
						<span>
							{answers.length} {answers.length === 1 ? 'answer' : 'answers'}
						</span>
					</Link>
				</div>
			</CardContent>
			<CardFooter className="grid w-full">
				<div className="border-border/50 flex items-center justify-between border-t pt-2">
					<div className="text-muted-foreground flex items-center gap-4 text-sm">
						<Flagged name="phrase_request_likes" className="hidden">
							<div className="flex items-center gap-2">
								<Heart className="h-4 w-4 text-red-500" />
								<span className="text-foreground font-medium">
									{request.popularityCount} 4
								</span>
								<span>others want to know this</span>
							</div>
						</Flagged>
					</div>

					<div className="flex items-center gap-2">
						<CopyLinkButton url={shareUrl} text="" size="icon" />
						<ShareRequestButton
							id={request.id!}
							lang={request.lang!}
							variant="ghost"
							size="icon"
						/>
						<SendRequestToFriendDialog lang={request.lang} id={request.id}>
							<Button title="share in chat" size="icon" variant="ghost">
								<Send />
							</Button>
						</SendRequestToFriendDialog>
						<Link
							to="/learn/$lang/requests/$id"
							// oxlint-disable-next-line jsx-no-new-object-as-prop
							params={{ lang: request.lang!, id: request.id! }}
							className={cn(
								buttonVariants({ size: 'sm', variant: 'outline-accent' })
							)}
						>
							View Details
						</Link>
					</div>
				</div>
			</CardFooter>
		</Card>
	)
}
