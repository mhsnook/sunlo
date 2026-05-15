import { MarkdownHint } from '@/components/comments/comment-dialog'
import { useUserId } from '@/lib/use-auth'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	PhraseRequestType,
	RequestPhraseFormSchema,
	requestPromptPlaceholders,
} from '@/features/requests/schemas'
import { useRequest } from '@/features/requests/hooks'
import { useOneRandomly } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAppForm } from '@/components/form'
import type { uuid } from '@/types/main'

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
				// Fire-and-forget create. The handler in phraseRequestsCollection.onInsert
				// does the supabase insert and mirrors the trigger's auto-upvote row
				// into phraseRequestUpvotesCollection (when that collection is ready).
				phraseRequestsCollection.insert({
					id,
					prompt: value.prompt,
					lang,
					requester_uid: userId,
					// DB trigger auto-upvotes the requester, so the count starts at 1.
					upvote_count: 1,
					deleted: false,
					created_at: new Date().toISOString(),
					updated_at: null,
				})
				invalidateFeed(lang)
				// Hand the optimistic row to the parent — it'll navigate to
				// /requests/[id]. If the insert rolls back, the destination
				// page's "couldn't find that request" fallback handles it; the
				// onInsert handler shows the error toast.
				const created = phraseRequestsCollection.get(id)
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
