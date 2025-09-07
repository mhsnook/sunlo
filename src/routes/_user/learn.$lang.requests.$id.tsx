import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowAndLogError, ShowError } from '@/components/errors'
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
import { Input } from '@/components/ui/input'
import languages from '@/lib/languages'
import Callout from '@/components/ui/callout'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'

const phraseRequestQuery = (id: string) => ({
	queryKey: ['phrase_request', id],
	queryFn: async () => {
		const { data, error } = await supabase
			.from('phrase_request')
			.select('*')
			.eq('id', id)
			.single()
		if (error) throw error
		return data
	},
})

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	component: FulfillRequestPage,
	loader: ({ params: { id }, context: { queryClient } }) =>
		queryClient.ensureQueryData(phraseRequestQuery(id)),
})

const FulfillRequestSchema = z.object({
	phrase_text: z.string().min(1, 'Please enter the phrase text.'),
	translation_text: z.string().min(1, 'Please enter a translation.'),
})

type FulfillRequestFormInputs = z.infer<typeof FulfillRequestSchema>

function FulfillRequestPage() {
	const { id } = Route.useParams()
	const { data: request, error, isPending } = useQuery(phraseRequestQuery(id))
	const queryClient = useQueryClient()

	const form = useForm<FulfillRequestFormInputs>({
		resolver: zodResolver(FulfillRequestSchema),
		defaultValues: {
			phrase_text: '',
			translation_text: '',
		},
	})

	const fulfillMutation = useMutation({
		mutationFn: async (values: FulfillRequestFormInputs) => {
			// TODO: Create and call an RPC function 'fulfill_phrase_request'
			// This RPC would create the phrase, the translation, and update the request status.
			// For now, we'll just simulate it.
			console.log('Fulfilling request with:', { requestId: id, ...values })
			const { error: rpcError } = await supabase.rpc('fulfill_phrase_request', {
				request_id: id,
				p_phrase_text: values.phrase_text,
				p_translation_text: values.translation_text,
				p_translation_lang: 'eng',
			})
			if (rpcError) throw rpcError
			return true
		},
		onSuccess: () => {
			toast.success('Thank you for your contribution!')
			void queryClient.invalidateQueries({ queryKey: ['phrase_request', id] })
		},
		onError: (err) => {
			toast.error(`An error occurred: ${err.message}`)
		},
	})

	if (isPending) return <Loader />
	if (error) return <ShowError>{error.message}</ShowError>
	if (!request) return <p>Request not found.</p>

	if (request.status === 'fulfilled') {
		return (
			<main className="w-app space-y-4 p-4">
				<Callout Icon={SuccessCheckmarkTrans}>
					<h2 className="h3">Request Fulfilled</h2>
					<p>This phrase request has been fulfilled. Thank you!</p>
					<Link
						className="s-link"
						to="/learn/$lang/$id"
						params={{ lang: request.lang, id: request.fulfilled_phrase_id! }}
					>
						View the new phrase (or suggest your own translation!)
					</Link>
				</Callout>
				<BigPhraseCard lang={request.lang} pid={request.fulfilled_phrase_id!} />
			</main>
		)
	}

	return (
		<main className="w-app p-4">
			<Card>
				<CardHeader>
					<CardTitle>Help with a Phrase Request</CardTitle>
					<CardDescription>
						A friend is asking for help with the following prompt for the{' '}
						<strong>{languages[request.lang]}</strong> language:
					</CardDescription>
				</CardHeader>
				<CardContent>
					<blockquote className="border-primary/50 bg-primary/10 border-l-4 p-4 italic">
						"{request.prompt}"
					</blockquote>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit((data) =>
								fulfillMutation.mutate(data)
							)}
							className="mt-6 space-y-4"
						>
							<FormField
								control={form.control}
								name="phrase_text"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Phrase in {languages[request.lang]}</FormLabel>
										<FormControl>
											<Textarea
												placeholder="e.g., C'est délicieux"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="translation_text"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Translation (in English)</FormLabel>
										<FormControl>
											<Input placeholder="e.g., It's delicious" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" disabled={fulfillMutation.isPending}>
								{fulfillMutation.isPending ? 'Submitting...' : 'Submit Phrase'}
							</Button>
							<ShowAndLogError error={fulfillMutation.error} />
						</form>
					</Form>
				</CardContent>
			</Card>
		</main>
	)
}
