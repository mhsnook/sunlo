import { Link } from '@tanstack/react-router'
import {
	CheckCircle,
	Clock,
	Heart,
	MessagesSquare,
	Send,
	WalletCards,
} from 'lucide-react'

import { Badge, LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { ago } from '@/lib/dayjs'
import UserPermalink from '@/components/user-permalink'
import CopyLinkButton from '@/components/copy-link-button'
import Flagged from '@/components/flagged'
import { Blockquote } from '@/components/ui/blockquote'
import { Button } from '@/components/ui/button'
import { SendRequestToFriendDialog } from '@/components/send-request-to-friend-dialog'
import { ShareRequestButton } from '@/components/share-request-button'
import { PhraseRequestType } from '@/lib/schemas'
import { useRequestAnswers } from '@/hooks/use-language'
import { useOnePublicProfile } from '@/hooks/use-public-profile'

export function RequestItem({ request }: { request: PhraseRequestType }) {
	const { data: answers } = useRequestAnswers(request.id)
	const { data: requester } = useOnePublicProfile(request.requester_uid)
	if (!request) return null
	const shareUrl = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`
	return (
		<div className="group transition-all duration-200 not-last:border-b">
			<div className="space-y-1 px-6 py-6">
				<div className="flex flex-row items-center justify-between gap-2">
					<Flagged name="multiple_languages_feed">
						<LangBadge lang={request.lang} />
					</Flagged>
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
					{requester && (
						<UserPermalink
							username={requester.username}
							avatar_path={requester.avatar_path}
							uid={request.requester_uid}
							className="text-muted-foreground"
						/>
					)}{' '}
					•
					<Link
						to="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: request.lang, id: request.id }}
						className="s-link-hidden text-primary-foresoft"
					>
						{ago(request.created_at)}
					</Link>{' '}
				</div>
			</div>
			<div className="px-6 pb-6">
				<div className="space-y-4">
					<Blockquote>{request.prompt}</Blockquote>
				</div>

				<div className="flex items-center justify-between">
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
									{answers.length} {answers.length === 1 ? 'answer' : 'answers'}
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
				</div>
			</div>
		</div>
	)
}
