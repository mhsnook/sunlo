import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import { MessageSquarePlus, Send, Star } from 'lucide-react'

import supabase from '@/lib/supabase-client'
import { CardContent } from '@/components/ui/card'
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
import UserPermalink from '@/components/card-pieces/user-permalink'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import {
	type FulfillRequestResponse,
	usePhrasesFromRequest,
	useRequest,
} from '@/hooks/use-requests'
import Callout from '@/components/ui/callout'
import { DestructiveOctagon } from '@/components/ui/destructive-octagon-badge'
import CopyLinkButton from '@/components/copy-link-button'
import { ShareRequestButton } from '@/components/card-pieces/share-request-button'
import { SendRequestToFriendDialog } from '@/components/card-pieces/send-request-to-friend'
import { cardsCollection, phrasesCollection } from '@/lib/collections'
import { CardMetaSchema, PhraseFullSchema } from '@/lib/schemas'
import Flagged from '@/components/flagged'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'

import { Markdown } from '@/components/my-markdown'
import { Badge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/card-pieces/request-header-footer'

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
			<CardlikeRequest>
				<RequestHeader profile={request.profile} request={request} />

				<CardContent className="flex flex-col gap-2">
					<Flagged>
						<div className="inline-flex flex-row gap-2">
							<Badge variant="outline">Food</Badge>
							<Badge variant="outline">Beginners</Badge>
						</div>
					</Flagged>
					<p className="text-lg">
						<Markdown>{request.prompt}</Markdown>
					</p>

					<p className="text-muted-foreground mt-4 text-sm">
						{phrases?.length ?? 0} comments, {phrases?.length ?? 0} answer
						{phrases?.length !== 1 && 's'} so far
					</p>

					<div className="flex w-full flex-row justify-between gap-4">
						<Dialog open={isAnswering} onOpenChange={setIsAnswering}>
							<DialogTrigger asChild>
								<Button>
									<MessageSquarePlus />{' '}
									{Array.isArray(phrases) && phrases.length > 0 ?
										'Submit an answer'
									:	'Answer this request'}
								</Button>
							</DialogTrigger>
							<DialogContent className="mt-4 w-full rounded px-4 pt-4 pb-4 shadow">
								<DialogHeader>
									<DialogTitle>Provide an answer</DialogTitle>
								</DialogHeader>
								<Markdown>{request.prompt}</Markdown>
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
							</DialogContent>
						</Dialog>
						<div className="flex flex-row items-center gap-2">
							<CopyLinkButton
								url={`${window.location.host}/learn/${params.lang}/requests/${params.id}`}
								variant="ghost"
								size="icon"
								text=""
							/>
							<ShareRequestButton
								id={params.id}
								lang={params.lang}
								variant="ghost"
								size="icon"
							/>
							<SendRequestToFriendDialog id={params.id} lang={params.lang}>
								<Button variant="ghost" size="icon">
									<Send />
								</Button>
							</SendRequestToFriendDialog>
						</div>
					</div>
				</CardContent>
			</CardlikeRequest>
			{!phrases?.length ? null : (
				phrases.map((phrase) => (
					<div key={phrase.id} className="ms-4 space-y-2 border border-t-0 p-4">
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
							<Flagged name="favourite_answer" className="flex flex-row gap-2">
								<Button
									variant="outline"
									size="icon"
									className="text-muted-foreground"
									disabled
								>
									<Star />
								</Button>
							</Flagged>
						</div>
						<Flagged>
							<p className="py-4 text-lg">
								This is a <em>great</em> question! Sample comment showing an
								answer:
							</p>
						</Flagged>
						<CardResultSimple phrase={phrase} />
						<Flagged>
							<p className="s-link py-4 text-sm">show 3 replies</p>
						</Flagged>
						{/* <p className="py-4 text-sm underline text-muted-foreground">4 replies</p> */}
					</div>
				))
			)}
		</main>
	)
}
