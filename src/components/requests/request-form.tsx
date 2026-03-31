import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'

import supabase from '@/lib/supabase-client'
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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import Callout from '@/components/ui/callout'
import { toastSuccess, toastError } from '@/components/ui/sonner'
import type { uuid } from '@/types/main'

export function RequestForm({
	lang,
	requestId,
	onSuccess,
	onCancel,
	formTestId = 'new-request-form',
	inputTestId = 'request-prompt-input',
	submitTestId = 'post-request-button',
	rows,
}: {
	lang: string
	requestId?: uuid
	onSuccess?: (data: PhraseRequestType) => void
	onCancel?: () => void
	formTestId?: string
	inputTestId?: string
	submitTestId?: string
	rows?: number
}) {
	const userId = useUserId()
	const placeholder = useOneRandomly(requestPromptPlaceholders)
	const invalidateFeed = useInvalidateFeed()
	const { data: request } = useRequest(requestId ?? '')
	const isEditing = !!requestId

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseFormSchema),
		defaultValues: { prompt: request?.prompt ?? '' },
	})

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
			form.reset()
			onSuccess?.(data)
		},
		onError: (error) => {
			console.error(error)
			toastError(
				isEditing ?
					'There was an error updating your request.'
				:	'There was an error posting your request.'
			)
		},
	})

	return (
		<Form {...form}>
			<form
				data-testid={formTestId}
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="prompt"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								What kinds of flash cards are you looking for?
							</FormLabel>
							<FormControl>
								<Textarea
									data-testid={inputTestId}
									placeholder={isEditing ? undefined : `ex: "${placeholder}"`}
									rows={rows}
									{...field}
								/>
							</FormControl>
							<p className="text-muted-foreground -mt-1 text-xs">
								Supports markdown like `&gt;` for blockquote, <em>_italics_</em>
								, <strong>**bold**</strong>.
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				{mutation.isError && (
					<Callout size="sm" variant="problem">
						<p className="font-bold">Error</p>
						<p>{mutation.error.message}</p>
					</Callout>
				)}
				<div className="flex gap-2">
					<Button
						type="submit"
						size={isEditing ? 'sm' : 'default'}
						data-testid={submitTestId}
						disabled={mutation.isPending}
					>
						{mutation.isPending ?
							isEditing ?
								'Saving...'
							:	'Posting...'
						: isEditing ?
							'Save'
						:	'Post Request'}
					</Button>
					{onCancel && (
						<Button
							size="sm"
							type="button"
							variant="neutral"
							onClick={onCancel}
						>
							Cancel
						</Button>
					)}
				</div>
			</form>
		</Form>
	)
}
