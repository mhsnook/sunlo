import { useState } from 'react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { and, eq, not } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import {
	Archive,
	Check,
	ExternalLink,
	Pencil,
	Plus,
	ThumbsUp,
	Undo2,
	X,
} from 'lucide-react'

import { Badge, LangBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader } from '@/components/ui/loader'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { WithPhrase } from '@/components/with-phrase'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import {
	messageTagLinksCollection,
	phraseRequestsCollection,
} from '@/features/requests/collections'
import {
	PhraseRequestSchema,
	type PhraseRequestType,
} from '@/features/requests/schemas'
import {
	useMessageTags,
	useMessageTagsForMessage,
	useRequestLinksPhraseIds,
} from '@/features/requests/hooks'
import type { PhraseFullFilteredType } from '@/features/phrases/schemas'
import { useAuth } from '@/lib/use-auth'
import supabase from '@/lib/supabase-client'
import { ago } from '@/lib/dayjs'
import type { uuid } from '@/types/main'

export const Route = createLazyFileRoute('/_user/admin/$lang/requests/$id')({
	component: AdminRequestDetail,
})

function AdminRequestDetail() {
	const { lang, id } = Route.useParams()
	const { isAdmin } = useAuth()
	const { data: request, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsCollection })
				.where(({ request }) => eq(request.id, id))
				.findOne(),
		[id]
	)

	if (isLoading) return <Loader />

	if (!request) {
		return (
			<Callout variant="problem">
				<p>Request not found.</p>
			</Callout>
		)
	}

	return (
		<div className="space-y-6" data-testid="admin-request-detail">
			<div className="space-y-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1 space-y-1">
						{request.deleted && (
							<Badge variant="destructive" className="gap-1">
								<Archive className="size-3" /> Archived
							</Badge>
						)}
						<EditableRequestPrompt request={request} isAdmin={isAdmin} />
					</div>
					<ArchiveRequestButton request={request} disabled={!isAdmin} />
				</div>
			</div>

			<Separator />

			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Details</h3>
				<dl className="text-sm">
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Requested by
						</dt>
						<dd>
							<UidPermalink
								uid={request.requester_uid}
								timeValue={request.created_at}
							/>
						</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Created
						</dt>
						<dd>{ago(request.created_at)}</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Upvotes
						</dt>
						<dd className="inline-flex items-center gap-1">
							<ThumbsUp className="h-3 w-3" />
							{request.upvote_count ?? 0}
						</dd>
					</div>
					<div className="flex items-baseline gap-2 py-1">
						<dt className="text-muted-foreground min-w-[100px] shrink-0">
							Request ID
						</dt>
						<dd className="text-muted-foreground font-mono text-xs break-all">
							{request.id}
						</dd>
					</div>
				</dl>
			</div>

			<Separator />

			<MessageSection requestId={request.id} messageId={request.message_id!} />

			<Separator />

			<AttachedPhrasesSection requestId={request.id} lang={lang} />

			<Separator />

			<div>
				<Link
					to="/learn/$lang/requests/$id"
					params={{ lang, id: request.id }}
					className={buttonVariants({ variant: 'soft', size: 'sm' })}
				>
					View public request page
				</Link>
			</div>
		</div>
	)
}

function MessageSection({
	requestId,
	messageId,
}: {
	requestId: uuid
	messageId: uuid
}) {
	const { isAdmin } = useAuth()
	const { data: tags } = useMessageTagsForMessage(messageId)
	return (
		<div className="space-y-3" data-testid="admin-request-message-section">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Message</h3>
				<Link
					to="/admin/messages/$id"
					params={{ id: messageId }}
					className={buttonVariants({ variant: 'soft', size: 'sm' })}
				>
					View this message <ExternalLink className="ms-1 h-3 w-3" />
				</Link>
			</div>
			<dl className="text-sm">
				<div className="flex items-baseline gap-2 py-1">
					<dt className="text-muted-foreground min-w-[100px] shrink-0">
						Message ID
					</dt>
					<dd className="text-muted-foreground font-mono text-xs break-all">
						{messageId}
					</dd>
				</div>
				<div className="flex items-baseline gap-2 py-1">
					<dt className="text-muted-foreground min-w-[100px] shrink-0">Tags</dt>
					<dd className="flex flex-wrap items-center gap-1">
						{tags?.map((tag) => (
							<Badge
								key={tag.slug}
								variant="outline"
								data-testid="admin-request-tag-chip"
								data-key={tag.slug}
							>
								{tag.label}
								{isAdmin ? (
									<button
										type="button"
										className="hover:text-c-hi ms-1 -me-1 inline-flex items-center"
										aria-label={`Remove ${tag.label}`}
										onClick={() => detachTag(messageId, tag.slug)}
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
								messageId={messageId}
								currentSlugs={new Set(tags?.map((t) => t.slug) ?? [])}
							/>
						)}
					</dd>
				</div>
			</dl>
			<RelatedRequestsSection
				messageId={messageId}
				currentRequestId={requestId}
			/>
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
					data-testid="admin-request-add-tag"
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
									className="hover:bg-1-lo-neutral flex cursor-pointer items-center gap-2 rounded p-2 text-sm"
									data-testid="admin-request-tag-option"
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

function RelatedRequestsSection({
	messageId,
	currentRequestId,
}: {
	messageId: uuid
	currentRequestId: uuid
}) {
	const { data: siblings } = useLiveQuery(
		(q) =>
			q
				.from({ req: phraseRequestsCollection })
				.where(({ req }) =>
					and(eq(req.message_id, messageId), not(eq(req.id, currentRequestId)))
				)
				.orderBy(({ req }) => req.created_at, 'desc'),
		[messageId, currentRequestId]
	)

	if (!siblings || siblings.length === 0) return null

	return (
		<div className="space-y-1 pt-2">
			<h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				Other requests on this message ({siblings.length})
			</h4>
			<ul className="divide-y border" data-testid="related-requests-list">
				{siblings.map((req) => (
					<li
						key={req.id}
						className="flex items-center gap-2 p-2 text-sm"
						data-testid="related-request"
						data-key={req.id}
					>
						<LangBadge lang={req.lang} />
						<span className="min-w-0 flex-1 truncate">{req.prompt}</span>
						<Link
							to="/admin/$lang/requests/$id"
							params={{ lang: req.lang, id: req.id }}
							className={buttonVariants({ variant: 'ghost', size: 'sm' })}
							aria-label="Open admin page"
						>
							<ExternalLink className="h-3 w-3" />
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}

function AttachedPhrasesSection({
	requestId,
	lang,
}: {
	requestId: uuid
	lang: string
}) {
	const { data: links } = useRequestLinksPhraseIds(requestId)
	return (
		<div className="space-y-2" data-testid="admin-request-phrases-section">
			<h3 className="text-lg font-semibold">
				Phrases attached ({links?.length ?? 0})
			</h3>
			{!links?.length ? (
				<p className="text-muted-foreground italic">
					No phrases have been suggested as answers yet.
				</p>
			) : (
				<ul className="divide-y border">
					{links.map((link) => (
						<li
							key={link.phrase_id}
							className="p-2"
							data-testid="attached-phrase"
							data-key={link.phrase_id}
						>
							<WithPhrase
								pid={link.phrase_id}
								Component={(props) => (
									<AttachedPhraseRow phrase={props.phrase} lang={lang} />
								)}
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

function AttachedPhraseRow({
	phrase,
	lang,
}: {
	phrase: PhraseFullFilteredType
	lang: string
}) {
	return (
		<div className="flex items-center gap-2 text-sm">
			<LangBadge lang={phrase.lang} />
			<span className="min-w-0 flex-1 truncate">{phrase.text}</span>
			<Link
				to="/admin/$lang/phrases/$id"
				params={{ lang, id: phrase.id }}
				className={buttonVariants({ variant: 'ghost', size: 'sm' })}
				aria-label="Open admin phrase page"
			>
				<ExternalLink className="h-3 w-3" />
			</Link>
		</div>
	)
}

function EditableRequestPrompt({
	request,
	isAdmin,
}: {
	request: { id: string; prompt: string }
	isAdmin: boolean
}) {
	const [isEditing, setIsEditing] = useState(false)
	const [editText, setEditText] = useState(request.prompt)

	const updateRequest = useMutation({
		mutationFn: async (newPrompt: string) => {
			const { data } = await supabase
				.from('phrase_request')
				.update({ prompt: newPrompt })
				.eq('id', request.id)
				.throwOnError()
				.select()
			if (!data) throw new Error('Failed to update request')
			return data[0]
		},
		onSuccess: (data) => {
			phraseRequestsCollection.utils.writeUpdate(
				PhraseRequestSchema.parse(data)
			)
			setIsEditing(false)
			toastSuccess('Request updated')
		},
		onError: (error) => {
			toastError('Failed to update request')
			console.error(error)
		},
	})

	const handleSave = () => {
		const trimmed = editText.trim()
		if (trimmed && trimmed !== request.prompt) {
			updateRequest.mutate(trimmed)
		} else {
			setIsEditing(false)
		}
	}

	const handleCancel = () => {
		setEditText(request.prompt)
		setIsEditing(false)
	}

	if (isEditing) {
		return (
			<div className="space-y-2">
				<Textarea
					value={editText}
					onChange={(e) => setEditText(e.target.value)}
					className="min-h-[100px]"
					onKeyDown={(e) => {
						if (e.key === 'Escape') handleCancel()
					}}
				/>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="default"
						onClick={handleSave}
						disabled={updateRequest.isPending}
					>
						<Check className="me-1 h-4 w-4" />
						Save
					</Button>
					<Button size="sm" variant="neutral" onClick={handleCancel}>
						Cancel
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="flex items-start gap-2">
			<div className="min-w-0 flex-1 text-lg">
				<Markdown>{request.prompt}</Markdown>
			</div>
			{isAdmin && (
				<Button
					size="icon"
					variant="ghost"
					className="size-7 shrink-0"
					onClick={() => setIsEditing(true)}
				>
					<Pencil className="size-3.5" />
				</Button>
			)}
		</div>
	)
}

function ArchiveRequestButton({
	request,
	disabled,
}: {
	request: PhraseRequestType
	disabled?: boolean
}) {
	const toggleArchive = useMutation({
		mutationFn: async () => {
			const { data } = await supabase
				.from('phrase_request')
				.update({ deleted: !request.deleted })
				.eq('id', request.id)
				.throwOnError()
				.select()
			if (!data) throw new Error('Failed to update request')
			return data[0]
		},
		onSuccess: (data) => {
			phraseRequestsCollection.utils.writeUpdate(
				PhraseRequestSchema.parse(data)
			)
			toastSuccess(request.deleted ? 'Request restored' : 'Request archived')
		},
		onError: (error) => {
			toastError('Failed to update request')
			console.error(error)
		},
	})

	return (
		<Button
			size="icon"
			variant="ghost"
			className="shrink-0"
			onClick={() => toggleArchive.mutate()}
			disabled={disabled || toggleArchive.isPending}
			aria-label={request.deleted ? 'Restore request' : 'Archive request'}
		>
			{request.deleted ? (
				<Undo2 className="size-4" />
			) : (
				<Archive className="text-destructive size-4" />
			)}
		</Button>
	)
}
