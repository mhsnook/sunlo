import { useState } from 'react'
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
import languages from '@/lib/languages'
import type {
	LanguageLoaded,
	PhraseFull,
	PublicProfile,
	Tag,
} from '@/types/main'
import { ago } from '@/lib/dayjs'
import UserPermalink from '@/components/user-permalink'
import { avatarUrlify } from '@/lib/utils'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import {
	type FulfillRequestResponse,
	type PhraseRequestFull,
	phraseRequestQuery,
} from '@/hooks/use-requests'
import { useProfile } from '@/hooks/use-profile'
import { Blockquote } from '@/components/ui/blockquote'
import Callout from '@/components/ui/callout'
import { DestructiveOctagon } from '@/components/ui/destructive-octagon-badge'
import CopyLinkButton from '@/components/copy-link-button'
import ShareRequestButton from '@/components/share-request-button'
import { MessageSquarePlus, Send } from 'lucide-react'
import { SendRequestToFriendDialog } from '@/components/friends/send-request-to-friend-dialog'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	component: FulfillRequestPage,
	loader: async ({ params: { id }, context: { queryClient } }) => {
		await queryClient.ensureQueryData(phraseRequestQuery(id))
	},
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
	const queryClient = useQueryClient()
	const {
		data: request,
		error,
		isPending,
	} = useSuspenseQuery(phraseRequestQuery(id))
	const { data: profile } = useProfile()

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
			const newPhrase: PhraseFull = {
				id: phrase.id,
				text: phrase.text,
				lang: phrase.lang,
				created_at: phrase.created_at,
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
				request_id: id,
				added_by: phrase.added_by,
				added_by_profile: {
					uid: profile!.uid,
					username: profile!.username,
					avatar_path: profile!.avatar_path,
					avatarUrl: avatarUrlify(profile!.avatar_path),
				} as PublicProfile,
				translations: [translation],
				tags: [] as Tag[],
			}

			const newRequest: PhraseRequestFull = {
				...request,
				phrases:
					!Array.isArray(request?.phrases) ?
						[newPhrase]
					:	[newPhrase, ...request.phrases],
				status: 'fulfilled',
			}

			// Optimistically update the request data
			queryClient.setQueryData(phraseRequestQuery(id).queryKey, newRequest)

			queryClient.setQueryData(
				['language', newPhrase.lang],
				(oldData: LanguageLoaded | undefined) => {
					const prevData = oldData ?? {
						pids: [],
						phrasesMap: {},
					}

					return {
						...prevData,
						pids: [...prevData.pids, phrase.id],
						phrasesMap: {
							...prevData.phrasesMap,
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

	const noAnswers = request.phrases?.length === 0

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
							username={request.requester?.username}
							avatarUrl={avatarUrlify(request.requester?.avatar_path)}
							className="px-1"
						/>
						{' • '}
						{ago(request.created_at)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Blockquote>&rdquo;{request.prompt}&ldquo;</Blockquote>

					{request.phrases && request.phrases.length > 0 && (
						<div className="mb-6 space-y-4">
							<h3 className="h3">
								{request.phrases.length} answer
								{request.phrases.length > 1 && 's'} so far
							</h3>
							{request.phrases.map((phrase: any) => (
								<div key={phrase.id} className="rounded-lg p-4 shadow">
									<p className="text-muted-foreground mb-2 text-sm">
										<UserPermalink
											uid={phrase.added_by}
											username={phrase.added_by_profile?.username}
											avatarUrl={avatarUrlify(
												phrase.added_by_profile?.avatar_path
											)}
											className="px-1"
										/>
										{' • '}
										<Link
											to="/learn/$lang/$id"
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
								{Array.isArray(request.phrases) && request.phrases.length > 0 ?
									'Submit another answer'
								:	'Answer this request'}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-4 rounded px-4 pt-4 pb-4 shadow">
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit((data) =>
										fulfillMutation.mutate(data)
									)}
									className="space-y-4"
								>
									<FormField
										control={form.control}
										name="phrase_text"
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
