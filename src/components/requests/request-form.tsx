import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'

import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	PhraseRequestSchema,
	PhraseRequestType,
	RequestPhraseFormSchema,
	type RequestPhraseFormInputs,
	requestPromptPlaceholders,
} from '@/features/requests/schemas'
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

export function RequestForm({
	lang,
	onSuccess,
	formTestId = 'new-request-form',
	inputTestId = 'request-prompt-input',
	submitTestId = 'post-request-button',
	rows,
}: {
	lang: string
	onSuccess?: (data: PhraseRequestType) => void
	formTestId?: string
	inputTestId?: string
	submitTestId?: string
	rows?: number
}) {
	const userId = useUserId()
	const placeholder = useOneRandomly(requestPromptPlaceholders)
	const invalidateFeed = useInvalidateFeed()

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseFormSchema),
		defaultValues: { prompt: '' },
	})

	const mutation = useMutation<
		PhraseRequestType,
		PostgrestError,
		RequestPhraseFormInputs
	>({
		mutationFn: async ({ prompt }) => {
			return (
				await supabase
					.from('phrase_request')
					.insert({ prompt, lang, requester_uid: userId! })
					.throwOnError()
					.select()
					.single()
			).data!
		},
		onSuccess: (data) => {
			phraseRequestsCollection.utils.writeInsert(
				PhraseRequestSchema.parse(data)
			)
			invalidateFeed(lang)
			form.reset()
			toastSuccess('Your request has been posted!')
			onSuccess?.(data)
		},
		onError: (error) => {
			console.error(error)
			toastError('There was an error posting your request.')
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
									placeholder={`ex: "${placeholder}"`}
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
				<Button
					type="submit"
					data-testid={submitTestId}
					disabled={mutation.isPending}
				>
					{mutation.isPending ? 'Posting...' : 'Post Request'}
				</Button>
			</form>
		</Form>
	)
}
