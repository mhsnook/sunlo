import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'

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
	type RequestPhraseFormInputs,
	requestPromptPlaceholders,
} from '@/features/requests/schemas'
import { useRequest } from '@/features/requests/hooks'
import { useOneRandomly } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAppForm } from '@/components/form'
import { toastSuccess, toastError } from '@/components/ui/sonner'
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

	const mutation = useMutation<
		PhraseRequestType,
		PostgrestError,
		RequestPhraseFormInputs
	>({
		mutationFn: async ({ prompt }) => {
			if (isEditing) {
				const { data } = await supabase
					.from('phrase_request')
					.update({ prompt })
					.eq('id', requestId)
					.throwOnError()
					.select()
					.single()
				return data!
			}
			const { data } = await supabase
				.from('phrase_request')
				.insert({ prompt, lang, requester_uid: userId! })
				.throwOnError()
				.select()
				.single()
			return data!
		},
		onSuccess: (data) => {
			const parsed = PhraseRequestSchema.parse(data)
			if (isEditing) {
				phraseRequestsCollection.utils.writeUpdate(parsed)
				toastSuccess('Request updated!')
			} else {
				// The DB trigger auto-upvotes, but RETURNING gets the pre-trigger value.
				// Override upvote_count to reflect the auto-upvote.
				phraseRequestsCollection.utils.writeInsert({
					...parsed,
					upvote_count: 1,
				})
				phraseRequestUpvotesCollection.utils.writeInsert({
					request_id: data.id,
				})
				invalidateFeed(lang)
				toastSuccess('Your request has been posted!')
			}
			onSuccess?.(data)
		},
		onError: (error) => {
			console.error(error)
			toastError(
				isEditing
					? 'There was an error updating your request.'
					: 'There was an error posting your request.'
			)
		},
	})

	const form = useAppForm({
		defaultValues: { prompt: request?.prompt ?? '' },
		validators: { onChange: RequestPhraseFormSchema },
		onSubmit: async ({ value, formApi }) => {
			await mutation.mutateAsync(value)
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

			<form.AppForm>
				<form.FormAlert
					error={mutation.error}
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
