import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import {
	Archive,
	ArrowLeft,
	Check,
	Pencil,
	ThumbsUp,
	Undo2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { Loader } from '@/components/ui/loader'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	PhraseRequestSchema,
	type PhraseRequestType,
} from '@/features/requests/schemas'
import { useAuth } from '@/lib/use-auth'
import supabase from '@/lib/supabase-client'
import { Markdown } from '@/components/my-markdown'
import { ago } from '@/lib/dayjs'

export const Route = createFileRoute('/_user/admin/$lang/requests/$id')({
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
			<div className="space-y-4">
				<BackLink lang={lang} />
				<Callout variant="problem">
					<p>Request not found.</p>
				</Callout>
			</div>
		)
	}

	return (
		<div className="space-y-6" data-testid="admin-request-detail">
			<BackLink lang={lang} />

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

function BackLink({ lang }: { lang: string }) {
	return (
		<Link
			to="/admin/$lang/requests"
			params={{ lang }}
			className={buttonVariants({ variant: 'ghost', size: 'sm' })}
		>
			<ArrowLeft className="me-1 h-4 w-4" />
			All requests
		</Link>
	)
}
