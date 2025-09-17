import { Link } from '@tanstack/react-router'
import { CheckCircle, Clock, Heart, MessageSquare, Send } from 'lucide-react'
import { Badge, LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { avatarUrlify, cn } from '@/lib/utils'
import { ago } from '@/lib/dayjs'
import UserPermalink from '@/components/user-permalink'
import CopyLinkButton from '@/components/copy-link-button'
import { PhraseRequestFull } from '@/lib/use-requests'
import Flagged from '@/components/flagged'
import { Blockquote } from '../ui/blockquote'
import { Button } from '../ui/button'
import { SendRequestToFriendDialog } from '../friends/send-request-to-friend-dialog'

export function RequestItem({ request }: { request: PhraseRequestFull }) {
	if (!request) return null
	const answers = Array.isArray(request.phrases) ? request.phrases : []
	const shareUrl = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`
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
				<div className="text-muted-foreground mt-2 flex min-w-0 items-center gap-2 text-sm">
					<span className="font-medium">
						<UserPermalink
							username={request.requester?.username ?? ''}
							avatarUrl={avatarUrlify(request.requester?.avatar_path) ?? ''}
							uid={request.requester_uid}
							className="text-muted-foreground"
						/>
					</span>
					<span>•</span>

					<Link
						to="/learn/$lang/requests/$id"
						params={{ lang: request.lang, id: request.id }}
						className="s-link-hidden"
					>
						{ago(request.created_at)}
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<Blockquote>&ldquo;{request.prompt}&rdquo;</Blockquote>

					<Link
						to="/learn/$lang/requests/$id"
						params={{ lang: request.lang, id: request.id }}
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

						<SendRequestToFriendDialog lang={request.lang} id={request.id}>
							<Button title="share in chat" size="icon" variant="ghost">
								<Send />
							</Button>
						</SendRequestToFriendDialog>
						<Link
							to="/learn/$lang/requests/$id"
							params={{ lang: request.lang, id: request.id }}
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
