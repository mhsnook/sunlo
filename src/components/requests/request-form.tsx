import { createOptimisticAction } from '@tanstack/db'

import supabase from '@/lib/supabase-client'
import { MarkdownHint } from '@/components/comments/comment-dialog'
import { useUserId } from '@/lib/use-auth'
import { useInvalidateFeed } from '@/features/feed/hooks'
import {
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
import { toastError } from '@/components/ui/sonner'
import type { uuid } from '@/types/main'

type CreateInput = {
	id: uuid
	prompt: string
	lang: string
	userId: uuid
}

const createRequest = createOptimisticAction<CreateInput>({
	onMutate: ({ id, prompt, lang, userId }) => {
		phraseRequestsCollection.insert({
			id,
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
	mutationFn: async ({ id, prompt, lang, userId }) => {
		try {
			const { data: inserted } = await supabase
				.from('phrase_request')
				.insert({ id, prompt, lang, requester_uid: userId })
				.select()
				.single()
				.throwOnError()
			// inserted.upvote_count is 0 (pre-trigger); override to 1 to match
			// the DB state after the auto-upvote trigger fires.
			phraseRequestsCollection.utils.writeInsert({
				...PhraseRequestSchema.parse(inserted),
				upvote_count: 1,
			})
			phraseRequestUpvotesCollection.utils.writeInsert({ request_id: id })
		} catch (err) {
			toastError('Failed to post your request — please try again')
			throw err
		}
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

	const form = useAppForm({
		defaultValues: { prompt: request?.prompt ?? '' },
		validators: { onChange: RequestPhraseFormSchema },
		onSubmit: ({ value, formApi }) => {
			if (isEditing) {
				// Fire-and-forget edit. Error toast lives in phraseRequestsCollection.onUpdate.
				phraseRequestsCollection.update(requestId, (draft) => {
					draft.prompt = value.prompt
				})
				const updated = phraseRequestsCollection.get(requestId)
				if (updated) onSuccess?.(updated)
			} else {
				if (!userId) return
				const id = crypto.randomUUID()
				createRequest({ id, prompt: value.prompt, lang, userId })
				const created = phraseRequestsCollection.get(id)
				invalidateFeed(lang)
				// Hand the optimistic row to the parent — it'll navigate to
				// /requests/[id]. If the action rolls back, useRequest on that
				// page returns undefined and the page renders its "couldn't find
				// that request" view. The action's mutationFn owns the error toast.
				if (created) onSuccess?.(created)
			}
			formApi.reset()
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
		</form>
	)
}
