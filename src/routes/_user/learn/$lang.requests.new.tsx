import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
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
import { PhraseRequestSchema, PhraseRequestType } from '@/lib/schemas'
import { phraseRequestsCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/learn/$lang/requests/new')({
	component: Page,
})

const RequestPhraseSchema = z.object({
	prompt: z
		.string()
		.min(10, {
			message: 'Your prompt must be at least 10 characters.',
		})
		.max(280, {
			message: 'Your prompt must be less than 280 characters.',
		}),
})

type RequestPhraseFormInputs = z.infer<typeof RequestPhraseSchema>

function Page() {
	const { lang } = Route.useParams()
	const userId = useUserId()
	const navigate = useNavigate()

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseSchema),
		defaultValues: {
			prompt: '',
		},
	})

	const createRequestMutation = useMutation<
		PhraseRequestType,
		PostgrestError,
		RequestPhraseFormInputs
	>({
		mutationFn: async ({ prompt }) => {
			return (
				await supabase
					.from('phrase_request')
					.insert({
						prompt,
						lang,
						requester_uid: userId,
					})
					.throwOnError()
					.select()
					.single()
			).data!
		},
		onSuccess: (data) => {
			phraseRequestsCollection.utils.writeInsert(
				PhraseRequestSchema.parse(data)
			)
			void navigate({
				to: '/learn/$lang/contributions',
				params: { lang },
				search: { contributionsTab: 'request' },
			})
			toast.success('Your request has been created!')
		},
		onError: (error) => {
			console.error(error)
			toast.error('There was an error creating your request.')
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Request a new card</CardTitle>
				<CardDescription>
					Ask a friend or a native speaker to help you create a new flashcard.
					Write a prompt for them below.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={form.handleSubmit((data) =>
							createRequestMutation.mutate(data)
						)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="prompt"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							render={({ field }) => (
								<FormItem>
									<FormLabel>What phrase do you need?</FormLabel>
									<FormControl>
										<Textarea
											placeholder="e.g., How do I say 'this is delicious' in a casual way?"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{
							// @TODO replace this with one of our many Error components
							createRequestMutation.isError && (
								<Callout size="sm" variant="problem">
									<p className="font-bold">Error</p>
									<p>{createRequestMutation.error.message}</p>
								</Callout>
							)
						}

						<Button type="submit" disabled={createRequestMutation.isPending}>
							{createRequestMutation.isPending ?
								'Creating...'
							:	'Create Request'}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	)
}
