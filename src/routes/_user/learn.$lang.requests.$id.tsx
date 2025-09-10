import { createFileRoute, Link } from '@tanstack/react-router'
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query'
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
import type {
	LanguageLoaded,
	PhraseFull,
	PhraseRow,
	TranslationRow,
} from '@/types/main'
import { ago } from '@/lib/dayjs'
import UserPermalink from '@/components/user-permalink'
import { avatarUrlify } from '@/lib/utils'

const phraseRequestQuery = (id: string) => ({
	queryKey: ['phrase_request', id],
	queryFn: async () => {
		const { data, error } = await supabase
			.from('phrase_request')
			.select(
				'*, requester:public_profile!phrase_request_requester_uid_fkey(*)'
			)
			.eq('id', id)
			.single()
		if (error) throw error
		return data
	},
})

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	component: FulfillRequestPage,
	loader: async ({ params: { id }, context: { queryClient } }) =>
		await queryClient.ensureQueryData(phraseRequestQuery(id)),
})

const FulfillRequestSchema = z.object({
	phrase_text: z.string().min(1, 'Please enter the phrase text.'),
	translation_text: z.string().min(1, 'Please enter a translation.'),
})

type FulfillRequestFormInputs = z.infer<typeof FulfillRequestSchema>

type FulfillRequestResponse = {
	phrase: PhraseRow
	translation: TranslationRow
}

function FulfillRequestPage() {
	const { id } = Route.useParams()
	const queryClient = useQueryClient()
	const {
		data: request,
		error,
		isPending,
	} = useSuspenseQuery(phraseRequestQuery(id))

	const form = useForm<FulfillRequestFormInputs>({
		resolver: zodResolver(FulfillRequestSchema),
		defaultValues: {
			phrase_text: '',
			translation_text: '',
		},
	})

	const fulfillMutation = useMutation<
		FulfillRequestResponse,
		Error,
		FulfillRequestFormInputs
	>({
		mutationFn: async (values: FulfillRequestFormInputs) => {
			const { data: rpcData, error: rpcError } = await supabase.rpc(
				'fulfill_phrase_request',
				{
					request_id: id,
					p_phrase_text: values.phrase_text,
					p_translation_text: values.translation_text,
					p_translation_lang: 'eng',
				}
			)
			if (rpcError) throw rpcError
			return rpcData as FulfillRequestResponse
		},
		onSuccess: (data) => {
			toast.success('Thank you for your contribution!')
			void queryClient.invalidateQueries({ queryKey: ['phrase_request', id] })

			const lang = request.lang
			queryClient.setQueryData(
				['language', lang],
				(oldData: LanguageLoaded | undefined) => {
					if (!oldData) return oldData

					const { phrase, translation } = data

					const newPhrase: PhraseFull = {
						id: phrase.id,
						text: phrase.text,
						lang: phrase.lang,
						created_at: phrase.created_at,
						translations: [translation],
						tags: [],
						avg_difficulty: null,
						avg_stability: null,
						count_active: 0,
						count_cards: 0,
						count_learned: 0,
						count_skipped: 0,
						percent_active: 0,
						percent_learned: 0,
						percent_skipped: 0,
						rank_least_difficult: null,
						rank_least_skipped: null,
						rank_most_learned: null,
						rank_most_stable: null,
						rank_newest: null,
					}

					return {
						...oldData,
						pids: [...oldData.pids, phrase.id],
						phrasesMap: {
							...oldData.phrasesMap,
							[phrase.id]: newPhrase,
						},
					}
				}
			)
		},
		onError: (err: Error) => {
			toast.error(`An error occurred: ${err.message}`)
		},
	})

	if (isPending) return <Loader />
	if (error) return <ShowError>{error.message}</ShowError>
	if (!request) return <p>Request not found.</p>

	return (
		<main className="w-app space-y-6">
			{request.status === 'fulfilled' && (
				<Callout Icon={SuccessCheckmarkTrans}>
					<h2 className="h3">Request Fulfilled</h2>
					<p>This phrase request has been fulfilled.</p>
					<Link
						className="s-link"
						to="/learn/$lang/$id"
						params={{ lang: request.lang, id: request.fulfilled_phrase_id! }}
					>
						View the new phrase (or suggest your own translation!)
					</Link>
				</Callout>
			)}
			<Card>
				<CardHeader>
					<CardTitle>
						{request.status !== 'fulfilled' && <>Help with a</>} Phrase Request
					</CardTitle>
					<CardDescription className="text-base/9">
						New phrase request made {ago(request.created_at)} by{' '}
						<UserPermalink
							uid={request.requester_uid}
							username={request.requester?.username}
							avatarUrl={avatarUrlify(request.requester?.avatar_path)}
						/>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<blockquote className="border-primary/50 bg-primary/10 mb-4 border-l-4 p-4 italic">
						"{request.prompt}"
					</blockquote>
					{request.status === 'fulfilled' ?
						<BigPhraseCard
							lang={request.lang}
							pid={request.fulfilled_phrase_id!}
						/>
					:	<Form {...form}>
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
									{fulfillMutation.isPending ?
										'Submitting...'
									:	'Submit Phrase'}
								</Button>
								<ShowAndLogError error={fulfillMutation.error} />
							</form>
						</Form>
					}
				</CardContent>
			</Card>
		</main>
	)
}
