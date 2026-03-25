import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import { ListMusic, MessageCircleHeart, MessageSquareQuote } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { useIsAuthenticated } from '@/components/require-auth'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { PhraseRequestSchema, PhraseRequestType } from '@/features/requests/schemas'
import { useOneRandomly } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { toastSuccess, toastError } from '@/components/ui/sonner'

const RequestPhraseSchema = z.object({
	prompt: z
		.string()
		.min(10, { message: 'Your prompt must be at least 10 characters.' })
		.max(280, { message: 'Your prompt must be less than 280 characters.' }),
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

export function FeedComposer({ lang }: { lang: string }) {
	const [isExpanded, setIsExpanded] = useState(false)
	const isAuth = useIsAuthenticated()
	const userId = useUserId()
	const placeholder = useOneRandomly(placeholders)
	const invalidateFeed = useInvalidateFeed()

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseSchema),
		defaultValues: { prompt: '' },
	})

	const mutation = useMutation<PhraseRequestType, PostgrestError, RequestPhraseFormInputs>({
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
			phraseRequestsCollection.utils.writeInsert(PhraseRequestSchema.parse(data))
			invalidateFeed(lang)
			form.reset()
			setIsExpanded(false)
			toastSuccess('Your request has been posted!')
		},
		onError: (error) => {
			console.error(error)
			toastError('There was an error posting your request.')
		},
	})

	const handleCancel = () => {
		form.reset()
		setIsExpanded(false)
	}

	return (
		<div className="mb-4 rounded border bg-card p-3 shadow-sm">
			{!isExpanded ?
				<button
					type="button"
					data-testid="feed-composer-trigger"
					onClick={() => setIsExpanded(true)}
					className="text-muted-foreground mb-3 w-full rounded-2xl border bg-0-mlo-neutral px-4 py-2.5 text-start text-sm transition-colors hover:bg-1-mlo-neutral"
				>
					{isAuth ?
						'Ask the community for a phrase...'
					:	'What are you looking for? Sign in to post a request...'}
				</button>
			:	<div className="mb-3">
					{isAuth ?
						<Form {...form}>
							<form
								data-testid="feed-composer-form"
								// eslint-disable-next-line @typescript-eslint/no-misused-promises
								onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
								className="space-y-2"
							>
								<FormField
									control={form.control}
									name="prompt"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Textarea
													data-testid="feed-composer-prompt"
													placeholder={`ex: "${placeholder}"`}
													autoFocus
													rows={3}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="flex gap-2">
									<Button
										type="submit"
										size="sm"
										data-testid="feed-composer-submit"
										disabled={mutation.isPending}
									>
										{mutation.isPending ? 'Posting...' : 'Post Request'}
									</Button>
									<Button
										type="button"
										variant="neutral"
										size="sm"
										onClick={handleCancel}
									>
										Cancel
									</Button>
								</div>
							</form>
						</Form>
					:	<p className="text-muted-foreground text-sm">
							<Link to="/login" className="s-link">
								Sign in
							</Link>{' '}
							to post a community request.
						</p>
					}
				</div>
			}

			<div className="flex flex-wrap gap-1 border-t pt-2">
				<button
					type="button"
					data-testid="feed-composer-request-btn"
					onClick={() => setIsExpanded(true)}
					className={buttonVariants({ variant: 'ghost', size: 'sm' })}
				>
					<MessageCircleHeart className="size-4" />
					<span>Request</span>
				</button>
				<Link
					to="/learn/$lang/phrases/new"
					params={{ lang }}
					data-testid="feed-composer-phrase-btn"
					className={buttonVariants({ variant: 'ghost', size: 'sm' })}
				>
					<MessageSquareQuote className="size-4" />
					<span>Phrase</span>
				</Link>
				<Link
					to="/learn/$lang/playlists/new"
					params={{ lang }}
					data-testid="feed-composer-playlist-btn"
					className={buttonVariants({ variant: 'ghost', size: 'sm' })}
				>
					<ListMusic className="size-4" />
					<span>Playlist</span>
				</Link>
			</div>
		</div>
	)
}
