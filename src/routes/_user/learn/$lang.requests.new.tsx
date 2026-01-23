import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'
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
import { useOneRandomly } from '@/lib/utils'
import { useInvalidateFeed } from '@/hooks/use-feed'

export const Route = createFileRoute('/_user/learn/$lang/requests/new')({
	component: NewRequestPage,
	beforeLoad: () => ({
		titleBar: { title: 'New Community Request' },
	}),
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

const placeholders = [
	`How to say to a cab driver 'hi, can you take me/are you free?'`,
	`I'm at lunch with a colleague; how do I say 'Broccoli is my favourite vegetable'?`,
	`Sincerely, but not like too deeply, I want to thank my neighbour auntie for helping me out recently`,
	`I want to compliment my friend's outfit (non flirty)`,
	`How do I say "Oh I love that place!" like a restaurant my friend is suggesting`,
	`I'd like to say "talk to you soon" but in a sort of business-y context`,
	`Help -- I need to learn to talk like a pirate to bond with my niece in her language`,
	`Hey everyone, how do I say: "this is delicious" in a casual way?`,
	`I'm meeting a friend's parents and I want to thank them for showing me around`,
	`Hey chat, I'm trying to better understand this song lyric...`,
	`Is there poetry in your language about garlic and how good it is?`,
]

function NewRequestPage() {
	const isAuth = useIsAuthenticated()
	const { lang } = Route.useParams()
	const userId = useUserId()
	const navigate = useNavigate()
	const placeholder = useOneRandomly(placeholders)

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseSchema),
		defaultValues: {
			prompt: '',
		},
	})

	const invalidateFeed = useInvalidateFeed()
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
						requester_uid: userId!,
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
			invalidateFeed(lang)
			void navigate({
				to: '/learn/$lang/requests/$id',
				params: { lang, id: data.id },
			})
			toastSuccess('Your request has been created!')
		},
		onError: (error) => {
			console.error(error)
			toastError('There was an error creating your request.')
		},
	})

	// Require auth to create requests
	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to create phrase requests.">
				<div />
			</RequireAuth>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Post a Request</CardTitle>
				<CardDescription>
					Ask the community (or share with a friend) for a flashcard
					recommendation from the library, or to make you a new one for everyone
					to learn.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						data-testid="new-request-form"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
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
									<FormLabel>
										What kinds of flash cards are you looking for?
									</FormLabel>
									<FormControl>
										<Textarea
											data-testid="request-prompt-input"
											placeholder={`ex: "${placeholder}"`}
											{...field}
										/>
									</FormControl>
									<p className="text-muted-foreground -mt-1 text-xs">
										Supports markdown like `&gt;` for blockquote,{' '}
										<em>_italics_</em>, <strong>**bold**</strong>.
									</p>
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
						<Button
							type="submit"
							data-testid="post-request-button"
							disabled={createRequestMutation.isPending}
						>
							{createRequestMutation.isPending ? 'Posting...' : 'Post Request'}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	)
}
