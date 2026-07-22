import { useState } from 'react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ExternalLink, Plus, X } from 'lucide-react'

import { Badge, LangBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/use-auth'
import { Loader } from '@/components/ui/loader'
import { Separator } from '@/components/ui/separator'
import { toastError } from '@/components/ui/sonner'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { ago } from '@/lib/dayjs'
import {
	messageTagLinksCollection,
	messagesCollection,
	phraseRequestsCollection,
} from '@/features/requests/collections'
import {
	useMessageTags,
	useMessageTagsForMessage,
} from '@/features/requests/hooks'
import type { uuid } from '@/types/main'

export const Route = createLazyFileRoute('/_user/admin/messages/$id')({
	component: AdminMessageDetail,
})

function AdminMessageDetail() {
	const { id } = Route.useParams()
	const { isAdmin } = useAuth()
	const { data: message, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ msg: messagesCollection })
				.where(({ msg }) => eq(msg.id, id))
				.findOne(),
		[id]
	)
	const { data: tags } = useMessageTagsForMessage(id)
	const { data: requests } = useLiveQuery(
		(q) =>
			q
				.from({ req: phraseRequestsCollection })
				.where(({ req }) => eq(req.message_id, id))
				.orderBy(({ req }) => req.created_at, 'asc'),
		[id]
	)

	if (isLoading) return <Loader />

	if (!message) {
		return (
			<Callout variant="problem">
				<p>Message not found.</p>
			</Callout>
		)
	}

	return (
		<div className="space-y-6" data-testid="admin-message-detail">
			<header className="space-y-1">
				<h1 className="text-2xl font-bold">Message</h1>
				<p className="text-muted-foreground font-mono text-xs break-all">
					{message.id}
				</p>
			</header>

			<dl className="text-sm">
				<div className="flex items-baseline gap-2 py-1">
					<dt className="text-muted-foreground min-w-[100px] shrink-0">
						Created
					</dt>
					<dd>{ago(message.created_at)}</dd>
				</div>
			</dl>

			<Separator />

			<section className="space-y-2">
				<h2 className="text-lg font-semibold">Tags</h2>
				<div
					className="flex flex-wrap items-center gap-1"
					data-testid="message-tags"
				>
					{tags?.map((tag) => (
						<Badge
							key={tag.slug}
							variant="outline"
							data-testid="message-tag-chip"
							data-key={tag.slug}
						>
							{tag.label}
							{isAdmin ? (
								<button
									type="button"
									className="hover:text-chroma-hi ms-1 -me-1 inline-flex items-center"
									aria-label={`Remove ${tag.label}`}
									onClick={() => detachTag(message.id, tag.slug)}
								>
									<X className="h-3 w-3" />
								</button>
							) : null}
						</Badge>
					))}
					{!tags?.length && (
						<span className="text-muted-foreground italic">No tags</span>
					)}
					{isAdmin && (
						<AddTagPopover
							messageId={message.id}
							currentSlugs={new Set(tags?.map((t) => t.slug) ?? [])}
						/>
					)}
				</div>
			</section>

			<Separator />

			<section className="space-y-2">
				<h2 className="text-lg font-semibold">
					Linked requests ({requests?.length ?? 0})
				</h2>
				{!requests?.length ? (
					<p className="text-muted-foreground italic">
						No requests are linked to this message.
					</p>
				) : (
					<ul className="divide-y border" data-testid="message-linked-requests">
						{requests.map((req) => (
							<li
								key={req.id}
								className="flex items-center gap-2 p-2 text-sm"
								data-testid="message-linked-request"
								data-key={req.id}
							>
								<LangBadge lang={req.lang} />
								<span className="min-w-0 flex-1 truncate">{req.prompt}</span>
								<span className="text-muted-foreground hidden text-xs @md:inline">
									{ago(req.created_at)}
								</span>
								<Link
									to="/admin/$lang/requests/$id"
									params={{ lang: req.lang, id: req.id }}
									className={buttonVariants({
										variant: 'ghost',
										size: 'sm',
									})}
									aria-label="Open admin request page"
								>
									<ExternalLink className="h-3 w-3" />
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	)
}

function AddTagPopover({
	messageId,
	currentSlugs,
}: {
	messageId: uuid
	currentSlugs: Set<string>
}) {
	const [open, setOpen] = useState(false)
	const { data: allTags } = useMessageTags()
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					size="sm"
					variant="ghost"
					data-testid="message-add-tag"
					aria-label="Edit tags"
				>
					<Plus className="h-3 w-3" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-2">
				<p className="text-muted-foreground px-2 pb-2 text-xs">
					Toggle tags for this message
				</p>
				<ul className="flex flex-col">
					{allTags?.map((tag) => {
						const isOn = currentSlugs.has(tag.slug)
						return (
							<li key={tag.slug}>
								<label
									className="hover:bg-lc-1 hover:bg-chroma-lo hover:bg-hue-neutral flex cursor-pointer items-center gap-2 rounded p-2 text-sm"
									data-testid="message-tag-option"
									data-key={tag.slug}
								>
									<Checkbox
										checked={isOn}
										onCheckedChange={(checked) => {
											if (checked) attachTag(messageId, tag.slug)
											else detachTag(messageId, tag.slug)
										}}
									/>
									<span>{tag.label}</span>
								</label>
							</li>
						)
					})}
				</ul>
			</PopoverContent>
		</Popover>
	)
}

function attachTag(messageId: uuid, tagSlug: string) {
	const tx = messageTagLinksCollection.insert({
		message_id: messageId,
		tag_slug: tagSlug,
		created_at: new Date().toISOString(),
	})
	tx.isPersisted.promise.catch((err: unknown) => {
		toastError('Failed to add tag')
		console.error(err)
	})
}

function detachTag(messageId: uuid, tagSlug: string) {
	const tx = messageTagLinksCollection.delete(`${messageId}--${tagSlug}`)
	tx.isPersisted.promise.catch((err: unknown) => {
		toastError('Failed to remove tag')
		console.error(err)
	})
}
