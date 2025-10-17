import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
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
import { ago } from '@/lib/dayjs'
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
import { phrasesCollection } from '@/lib/collections'

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
	const { id, lang } = Route.useParams()
	const [isAnswering, setIsAnswering] = useState(false)
	const { data: request, isLoading } = useRequest(id)
	const { data: phrases } = usePhrasesFromRequest(id)

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
			const { data: rpcData, error: rpcError } = await supabase.rpc(
				'fulfill_phrase_request',
				{
					request_id: id,
					p_phrase_text: values.phrase_text,
					p_translation_text: values.translation_text,
					p_translation_lang: values.translation_lang,
				}
			)
			if (rpcError) throw rpcError
			return rpcData as FulfillRequestResponse
		},
		onSuccess: (data, variables) => {
			toast.success('Thank you for your contribution!')
			setIsAnswering(false)
			form.reset({
				phrase_text: '',
				translation_text: '',
				translation_lang: variables.translation_lang,
			})
			const { phrase, translation } = data
			const newPhrase = { ...phrase, translations: [translation] }
			phrasesCollection.utils.writeInsert(newPhrase)
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
					<CardTitle>
						{request.status !== 'fulfilled' && <>Help with a</>} Phrase Request
					</CardTitle>
					<CardDescription className="text-base/7">
						Request from{' '}
						<UserPermalink
							uid={request.requester_uid}
							username={request.profile?.username}
							avatar_path={request.profile?.avatar_path}
							className="px-1"
						/>
						{' • '}
						{ago(request.created_at)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Blockquote>&rdquo;{request.prompt}&ldquo;</Blockquote>

					{phrases && phrases.length > 0 && (
						<div className="mb-6 space-y-4">
							<h3 className="h3">
								{phrases.length} answer
								{phrases.length > 1 && 's'} so far
							</h3>
							{phrases.map((phrase) => (
								<div key={phrase.id} className="rounded-lg p-4 shadow">
									<p className="text-muted-foreground mb-2 text-sm">
										<UserPermalink
											uid={phrase.added_by}
											username={phrase.profile?.username}
											avatar_path={phrase.profile?.avatar_path}
											className="px-1"
										/>
										{' • '}
										<Link
											to="/learn/$lang/$id"
											// oxlint-disable-next-line jsx-no-new-object-as-prop
											params={{ lang: phrase.lang, id: phrase.id }}
											className="s-link-hidden"
										>
											{ago(phrase.created_at)}
										</Link>
									</p>
									<CardResultSimple phrase={phrase} />
								</div>
							))}
						</div>
					)}

					<Collapsible
						open={isAnswering || noAnswers}
						onOpenChange={setIsAnswering}
					>
						<CollapsibleTrigger asChild className={noAnswers ? 'hidden' : ''}>
							<Button>
								<MessageSquarePlus />{' '}
								{Array.isArray(phrases) && phrases.length > 0 ?
									'Submit another answer'
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
										<Button type="submit" disabled={fulfillMutation.isPending}>
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
				</CardContent>
			</Card>
			<div className="grid w-full flex-grow grid-cols-3 justify-stretch gap-4 px-2 py-3">
				<CopyLinkButton
					url={`${window.location.host}/learn/${lang}/requests/${id}`}
					variant="outline"
					size="default"
				/>
				<ShareRequestButton
					id={id}
					lang={lang}
					variant="outline"
					size="default"
				/>
				<SendRequestToFriendDialog id={id} lang={lang}>
					<Button variant="outline" size="default">
						<Send />
						Send in chat
					</Button>
				</SendRequestToFriendDialog>
			</div>
		</main>
	)
}
