import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import { ListMusic, MessageCircleHeart, MessageSquareQuote } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { useIsAuthenticated } from '@/components/require-auth'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	PhraseRequestSchema,
	PhraseRequestType,
	RequestPhraseFormSchema,
	type RequestPhraseFormInputs,
	requestPromptPlaceholders,
} from '@/features/requests/schemas'
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { toastSuccess, toastError } from '@/components/ui/sonner'

export function FeedComposer({ lang }: { lang: string }) {
	const [open, setOpen] = useState(false)
	const isAuth = useIsAuthenticated()
	const userId = useUserId()
	const placeholder = useOneRandomly(requestPromptPlaceholders)
	const invalidateFeed = useInvalidateFeed()

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseFormSchema),
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
			setOpen(false)
			toastSuccess('Your request has been posted!')
		},
		onError: (error) => {
			console.error(error)
			toastError('There was an error posting your request.')
		},
	})

	return (
		<div className="mb-4 rounded border bg-card/50 p-3 shadow-sm">
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<button
						type="button"
						data-testid="feed-composer-trigger"
						className="border-3-mlo-primary hover:border-primary bg-card text-muted-foreground mb-3 flex h-10 w-full rounded-2xl border px-3 py-2 text-start text-sm inset-shadow-sm transition-colors"
					>
						Ask the community for a phrase...
					</button>
				</DialogTrigger>

				<div className="flex flex-wrap gap-1 border-t pt-2">
					<DialogTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							data-testid="feed-composer-request-btn"
						>
							<MessageCircleHeart className="size-4" />
							<span>Request</span>
						</Button>
					</DialogTrigger>
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

				<DialogContent data-testid="new-request-dialog">
					<DialogHeader>
						<DialogTitle>Post a Request</DialogTitle>
						<DialogDescription>
							Ask the community for a flashcard recommendation, or to make a new
							one for everyone to learn.
						</DialogDescription>
					</DialogHeader>
					{isAuth ?
						<Form {...form}>
							<form
								data-testid="feed-composer-form"
								// eslint-disable-next-line @typescript-eslint/no-misused-promises
								onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
								className="space-y-3"
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
													rows={4}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button
									type="submit"
									data-testid="feed-composer-submit"
									disabled={mutation.isPending}
								>
									{mutation.isPending ? 'Posting...' : 'Post Request'}
								</Button>
							</form>
						</Form>
					:	<p className="text-muted-foreground text-sm">
							<Link to="/login" className="s-link">
								Sign in
							</Link>{' '}
							to post a community request.
						</p>
					}
				</DialogContent>
			</Dialog>
		</div>
	)
}
