import { useState } from 'react'
import { createOptimisticAction } from '@tanstack/db'

import supabase from '@/lib/supabase-client'
import { newPublicId } from '@/lib/public-id'
import { MarkdownHint } from '@/components/comments/comment-dialog'
import { useUserId } from '@/lib/use-auth'
import { useInvalidateFeed } from '@/features/feed/hooks'
import {
	messagesCollection,
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'
import {
	PhraseRequestSchema,
	PhraseRequestType,
	RequestPhraseFormSchema,
	requestPromptPlaceholders,
} from '@/features/requests/schemas'
import { useRequest } from '@/features/requests/hooks'
import { useOneRandomly } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAppForm } from '@/components/form'
import { toastSuccess, toastError } from '@/components/ui/sonner'
import type { uuid } from '@/types/main'

type CreateInput = {
	id: uuid
	publicId: string
	prompt: string
	lang: string
	userId: uuid
}

const createRequest = createOptimisticAction<CreateInput>({
	onMutate: ({ id, publicId, prompt, lang, userId }) => {
		phraseRequestsCollection.insert({
			id,
			public_id: publicId,
			prompt,
			lang,
			requester_uid: userId,
			// DB trigger auto-upvotes the requester, so the count starts at 1.
			upvote_count: 1,
			deleted: false,
			created_at: new Date().toISOString(),
			updated_at: null,
		})
		phraseRequestUpvotesCollection.insert({ request_id: id })
	},
	mutationFn: async ({ id, publicId, prompt, lang, userId }) => {
		// .select() the inserted row back so we can drop the synced state
		// into the collections directly — no full-table refetch. The DB's
		// column DEFAULT on message_id creates the message row in the same
		// transaction; pull that into messagesCollection too.
		const { data } = await supabase
			.from('phrase_request')
			.insert({ id, public_id: publicId, prompt, lang, requester_uid: userId })
			.select()
			.single()
			.throwOnError()
		const parsed = PhraseRequestSchema.parse(data)
		phraseRequestsCollection.utils.writeInsert(parsed)
		messagesCollection.utils.writeInsert({
			id: parsed.message_id!,
			created_at: parsed.created_at,
		})
		// The auto-upvote trigger created the upvote row server-side; the
		// local schema is just { request_id }, no need to fetch it back.
		phraseRequestUpvotesCollection.utils.writeInsert({ request_id: id })
	},
})

export function RequestForm({
	lang,
	requestId,
	onSuccess,
	onCancel,
	formTestId = 'new-request-form',
	rows,
}: {
	lang: string
	requestId?: uuid
	onSuccess?: (data: PhraseRequestType) => void
	onCancel?: () => void
	formTestId?: string
	rows?: number
}) {
	const userId = useUserId()
	const placeholder = useOneRandomly(requestPromptPlaceholders)
	const invalidateFeed = useInvalidateFeed()
	const { data: request } = useRequest(requestId ?? '')
	const isEditing = !!requestId
	const [submitError, setSubmitError] = useState<Error | null>(null)

	const form = useAppForm({
		defaultValues: { prompt: request?.prompt ?? '' },
		validators: { onChange: RequestPhraseFormSchema },
		onSubmit: async ({ value, formApi }) => {
			setSubmitError(null)
			try {
				if (isEditing) {
					const tx = phraseRequestsCollection.update(requestId, (draft) => {
						draft.prompt = value.prompt
					})
					await tx.isPersisted.promise
					const updated = phraseRequestsCollection.get(requestId)
					toastSuccess('Request updated!')
					if (updated) onSuccess?.(updated)
				} else {
					await Promise.all([
						phraseRequestsCollection.preload(),
						phraseRequestUpvotesCollection.preload(),
						messagesCollection.preload(),
					])
					const id = crypto.randomUUID()
					const publicId = newPublicId()
					const tx = createRequest({
						id,
						publicId,
						prompt: value.prompt,
						lang,
						userId: userId!,
					})
					await tx.isPersisted.promise
					const created = phraseRequestsCollection.get(id)
					invalidateFeed(lang)
					toastSuccess('Your request has been posted!')
					if (created) onSuccess?.(created)
				}
				formApi.reset()
			} catch (err) {
				const error = err instanceof Error ? err : new Error('unknown error')
				setSubmitError(error)
				toastError(
					isEditing
						? 'There was an error updating your request.'
						: 'There was an error posting your request.'
				)
				console.error(error)
			}
		},
	})

	return (
		<form
			data-testid={formTestId}
			noValidate
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				void form.handleSubmit()
			}}
		>
			<form.AppField name="prompt">
				{(field) => (
					<field.TextareaInput
						label="What kinds of flash cards are you looking for?"
						placeholder={isEditing ? undefined : `ex: "${placeholder}"`}
						rows={rows}
					/>
				)}
			</form.AppField>
			<MarkdownHint />

			<div className="flex gap-2">
				<form.AppForm>
					<form.SubmitButton
						size={isEditing ? 'sm' : 'default'}
						pendingText={isEditing ? 'Saving...' : 'Posting...'}
					>
						{isEditing ? 'Save' : 'Post Request'}
					</form.SubmitButton>
				</form.AppForm>
				{onCancel && (
					<Button size="sm" type="button" variant="neutral" onClick={onCancel}>
						Cancel
					</Button>
				)}
			</div>

			<form.AppForm>
				<form.FormAlert
					error={submitError}
					text={
						isEditing
							? 'There was an error updating your request.'
							: 'There was an error posting your request.'
					}
				/>
			</form.AppForm>
		</form>
	)
}
