import { Link } from '@tanstack/react-router'
import { ExternalLink, Heart, MessageSquare } from 'lucide-react'
import { Badge, LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { avatarUrlify, cn } from '@/lib/utils'
import { ago } from '@/lib/dayjs'
import UserPermalink from '@/components/user-permalink'
import CopyLinkButton from '@/components/copy-link-button'

import type { PhraseRequestFull } from '@/routes/_user/learn.$lang.requests.$id'

export function RequestItem({ request }: { request: PhraseRequestFull }) {
	const shareUrl = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`

	return (
		<Card className="group border-border/50 hover:border-border transition-all duration-200 hover:shadow-md">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex min-w-0 flex-1 items-center gap-3">
						<LangBadge lang={request.lang} />
						<div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
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
								className="decoration-primary/30 flex-shrink-0 underline-offset-4 hover:underline"
							>
								{ago(request.created_at)}
							</Link>
						</div>
					</div>
					<Badge
						variant={request.status === 'fulfilled' ? 'default' : 'secondary'}
					>
						{request.status}
					</Badge>{' '}
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="text-foreground leading-relaxed text-balance">
						{request.prompt}
					</div>
				</div>
			</CardContent>
			<CardFooter className="grid w-full">
				<div className="border-border/50 flex items-center justify-between border-t pt-2">
					<div className="text-muted-foreground flex items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<MessageSquare className="h-4 w-4" />
							<span>
								{request.phrases?.length ?? 0}{' '}
								{request.phrases?.length === 1 ? 'answer' : 'answers'}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Heart className="h-4 w-4 text-red-500" />
							<span className="text-foreground font-medium">
								{request.popularityCount} 4
							</span>
							<span>others want to know this</span>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<CopyLinkButton url={shareUrl} text="" size="icon" />
						<Link
							to="/learn/$lang/requests/$id"
							params={{ lang: request.lang, id: request.id }}
							className={buttonVariants({ variant: 'ghost', size: 'icon' })}
						>
							<ExternalLink className="h-4 w-4" />
						</Link>
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
