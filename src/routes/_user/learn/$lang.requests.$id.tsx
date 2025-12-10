import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import { MessageSquarePlus, Send } from 'lucide-react'

import supabase from '@/lib/supabase-client'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowAndLogError } from '@/components/errors'
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
import languages from '@/lib/languages'
import UserPermalink from '@/components/user-permalink'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import {
	type FulfillRequestResponse,
	usePhrasesFromRequest,
	useRequest,
} from '@/hooks/use-requests'
import { Blockquote } from '@/components/ui/blockquote'
import Callout from '@/components/ui/callout'
import { DestructiveOctagon } from '@/components/ui/destructive-octagon-badge'
import CopyLinkButton from '@/components/copy-link-button'
import { ShareRequestButton } from '@/components/share-request-button'
import { SendRequestToFriendDialog } from '@/components/send-request-to-friend-dialog'
import { cardsCollection, phrasesCollection } from '@/lib/collections'
import { CardMetaSchema, PhraseFullSchema } from '@/lib/schemas'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	component: FulfillRequestPage,
})

const FulfillRequestSchema = z.object({
	phrase_text: z.string().min(1, 'Please enter the phrase text.'),
	translation_text: z.string().min(1, 'Please enter a translation.'),
	translation_lang: z.string().length(3, 'Please select a language.'),
})

type FulfillRequestFormInputs = z.infer<typeof FulfillRequestSchema>

function FulfillRequestPage() {
	const params = Route.useParams()
	const [isAnswering, setIsAnswering] = useState(false)
	const { data: request, isLoading } = useRequest(params.id)
	const { data: phrases } = usePhrasesFromRequest(params.id)

	const form = useForm<FulfillRequestFormInputs>({
		resolver: zodResolver(FulfillRequestSchema),
		defaultValues: {
			phrase_text: '',
			translation_text: '',
			translation_lang: 'eng',
		},
	})

	const fulfillMutation = useMutation<
		FulfillRequestResponse,
		Error,
		FulfillRequestFormInputs
	>({
		mutationFn: async (values: FulfillRequestFormInputs) => {
			console.log(`Beginning mutation`, { values })
			const { data: rpcData, error: rpcError } = await supabase.rpc(
				'fulfill_phrase_request',
				{
					request_id: params.id,
					p_phrase_text: values.phrase_text,
					p_translation_text: values.translation_text,
					p_translation_lang: values.translation_lang,
				}
			)
			if (rpcError) throw rpcError
			return rpcData as FulfillRequestResponse
		},
		onSuccess: (data, variables) => {
			setIsAnswering(false)
			form.reset({
				phrase_text: '',
				translation_text: '',
				translation_lang: variables.translation_lang,
			})
			const newPhrase = { ...data.phrase, translations: [data.translation] }
			phrasesCollection.utils.writeInsert(PhraseFullSchema.parse(newPhrase))
			if (data.card)
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(data.card))
			toast.success('Thank you for your contribution!')
		},
		onError: (err: Error) => {
			toast.error(`An error occurred: ${err.message}`)
		},
	})

	if (isLoading) return <Loader />

	if (!request)
		return (
			<Callout variant="problem" Icon={DestructiveOctagon}>
				<h1 className="h3">404 request not found</h1>
				<p>
					We're sorry, we could not locate that request. You might have typed in
					the link incorrectly? Or it may have been deleted.
				</p>
			</Callout>
		)

	const noAnswers = phrases?.length === 0

	return (
		<main>
			<Card>
				<CardHeader>
					<CardTitle>Request for {languages[request.lang]}</CardTitle>
				</CardHeader>
				<CardDescription className="sr-only">
					A request for a flash card, and discussion section with 0 comments nad{' '}
					{phrases?.length ?? 0} answers offered by the community.
				</CardDescription>
				<CardContent className="space-y-4">
					<UserPermalink
						uid={request.requester_uid}
						username={request.profile?.username}
						avatar_path={request.profile?.avatar_path}
						timeValue={request.created_at}
					/>
					<Blockquote>&rdquo;{request.prompt}&ldquo;</Blockquote>

					{phrases && phrases.length > 0 && (
						<div className="mb-6 space-y-4">
							<h3 className="h3">
								{phrases.length} answer
								{phrases.length > 1 && 's'} so far
							</h3>
							{phrases.map((phrase) => (
								<div
									key={phrase.id}
									className="rounded-0 space-y-2 p-4 hover:shadow"
								>
									<div className="flex flex-row items-center justify-between">
										<UserPermalink
											uid={phrase.added_by}
											username={phrase.profile?.username}
											avatar_path={phrase.profile?.avatar_path}
											timeValue={phrase.created_at}
											// oxlint-disable-next-line jsx-no-new-object-as-prop
											timeLinkParams={params}
											timeLinkTo="/learn/$lang/$id"
										/>
									</div>
									<CardResultSimple phrase={phrase} />
								</div>
							))}
						</div>
					)}
					<div className="flex flex-row gap-2">
						<Collapsible
							open={isAnswering || noAnswers}
							onOpenChange={setIsAnswering}
						>
							<CollapsibleTrigger asChild className={noAnswers ? 'hidden' : ''}>
								<Button>
									<MessageSquarePlus />{' '}
									{Array.isArray(phrases) && phrases.length > 0 ?
										'Submit an answer'
									:	'Answer this request'}
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-4 rounded px-4 pt-4 pb-4 shadow">
								<Form {...form}>
									<form
										// eslint-disable-next-line @typescript-eslint/no-misused-promises
										onSubmit={form.handleSubmit((data) =>
											fulfillMutation.mutate(data)
										)}
										className="space-y-4"
									>
										<FormField
											control={form.control}
											name="phrase_text"
											// oxlint-disable-next-line jsx-no-new-function-as-prop
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Phrase in {languages[request.lang]}
													</FormLabel>
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
										<div className="mb-8 grid gap-4">
											<FormField
												control={form.control}
												name="translation_text"
												// oxlint-disable-next-line jsx-no-new-function-as-prop
												render={({ field }) => (
													<FormItem className="col-span-2">
														<FormLabel>Translation</FormLabel>
														<FormControl>
															<Textarea
																placeholder="e.g., It's delicious"
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<TranslationLanguageField
												control={form.control}
												error={form.formState.errors.translation_lang}
											/>
										</div>
										<div className="space-x-2">
											<Button
												type="submit"
												disabled={fulfillMutation.isPending}
											>
												{fulfillMutation.isPending ?
													'Submitting...'
												:	'Submit Phrase'}
											</Button>
											<Button
												variant="secondary"
												className={noAnswers ? 'hidden' : ''}
												// oxlint-disable-next-line jsx-no-new-function-as-prop
												onClick={() => setIsAnswering(false)}
											>
												Cancel
											</Button>
										</div>
										<ShowAndLogError error={fulfillMutation.error} />
									</form>
								</Form>
							</CollapsibleContent>
						</Collapsible>
					</div>
				</CardContent>
			</Card>
			<div className="grid w-full flex-grow grid-cols-3 justify-stretch gap-4 px-2 py-3">
				<CopyLinkButton
					url={`${window.location.host}/learn/${params.lang}/requests/${params.id}`}
					variant="outline"
					size="default"
				/>
				<ShareRequestButton
					id={params.id}
					lang={params.lang}
					variant="outline"
					size="default"
				/>
				<SendRequestToFriendDialog id={params.id} lang={params.lang}>
					<Button variant="outline" size="default">
						<Send />
						Send in chat
					</Button>
				</SendRequestToFriendDialog>
			</div>
		</main>
	)
}
