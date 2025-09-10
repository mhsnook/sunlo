import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
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
import { PhraseRequest } from '@/types/main'

export const Route = createLazyFileRoute('/_user/learn/$lang/requests/new')({
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
	const { userId } = useAuth()
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseSchema),
		defaultValues: {
			prompt: '',
		},
	})

	const createRequestMutation = useMutation<
		unknown,
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
						requester_uid: userId!,
					})
					.throwOnError()
					.select()
					.single()
			).data!
		},
		onSuccess: (data) => {
			toast.success('Your request has been created!')
			void queryClient.setQueryData(
				['user', 'phrase_requests', lang],
				(old: PhraseRequest[] | undefined) => (old ? [data, ...old] : [data])
			)
			void navigate({ to: '/learn/$lang/requests', params: { lang } })
		},
		onError: (error) => {
			toast.error('There was an error creating your request.')
			console.error(error)
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
						onSubmit={form.handleSubmit((data) =>
							createRequestMutation.mutate(data)
						)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="prompt"
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

						{createRequestMutation.isError && (
							<Callout variant="problem">
								<p className="font-bold">Error</p>
								<p>{createRequestMutation.error.message}</p>
							</Callout>
						)}

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
