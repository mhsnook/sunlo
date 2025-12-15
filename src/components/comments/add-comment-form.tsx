import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Paperclip, X } from 'lucide-react'

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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { SelectPhrasesForComment } from './select-phrases-for-comment'
import supabase from '@/lib/supabase-client'
import { commentsCollection } from '@/lib/collections'
import { RequestCommentSchema } from '@/lib/schemas'
import type { uuid } from '@/types/main'
import { PhraseTinyCard } from '../cards/phrase-tiny-card'

const CommentFormSchema = z.object({
	content: z
		.string()
		.min(1, 'Please enter a comment')
		.max(1000, 'Comment must be less than 1000 characters'),
})

type CommentFormInputs = z.infer<typeof CommentFormSchema>

interface AddCommentFormProps {
	requestId: uuid
	lang: string
}

export function AddCommentForm({ requestId, lang }: AddCommentFormProps) {
	const [selectedPhraseIds, setSelectedPhraseIds] = useState<uuid[]>([])
	const [phraseDialogOpen, setPhraseDialogOpen] = useState(false)

	const form = useForm<CommentFormInputs>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: {
			content: '',
		},
	})

	const createCommentMutation = useMutation({
		mutationFn: async (values: CommentFormInputs) => {
			const { data, error } = await supabase.rpc(
				'create_comment_with_phrases',
				{
					p_request_id: requestId,
					p_content: values.content,
					p_parent_comment_id: null, // null for top-level comments
					p_phrase_ids: selectedPhraseIds,
				}
			)
			if (error) throw error
			return data
		},
		onSuccess: (data) => {
			// Parse and add to collection
			commentsCollection.utils.writeInsert(RequestCommentSchema.parse(data))
			// Reset form
			form.reset()
			setSelectedPhraseIds([])
			toast.success('Comment posted!')
		},
		onError: (error: Error) => {
			toast.error(`Failed to post comment: ${error.message}`)
		},
	})

	const handleRemovePhrase = (phraseId: uuid) => {
		setSelectedPhraseIds((prev) => prev.filter((id) => id !== phraseId))
	}

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) =>
					createCommentMutation.mutate(data)
				)}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="content"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Add a comment</FormLabel>

							<FormControl>
								<Textarea
									placeholder="Share your thoughts or answer the request..."
									rows={4}
									{...field}
								/>
							</FormControl>
							<p className="text-muted-foreground text-sm">
								Comments support markdown like `&gt;` for blockquote,{' '}
								<em>_italics_</em>, <strong>**bold**</strong>
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Attached flashcards */}
				{selectedPhraseIds && selectedPhraseIds.length > 0 && (
					<div className="space-y-2">
						<p className="text-sm font-medium">
							Attached flashcards ({selectedPhraseIds.length}/4)
						</p>
						<div className="grid grid-cols-2 space-y-2">
							{selectedPhraseIds.map((pid) => (
								<div key={pid} className="relative col-span-1 px-2 py-1">
									<PhraseTinyCard pid={pid} />
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="border-border absolute top-5 right-1 h-6 w-6 backdrop-blur-xs"
										// oxlint-disable-next-line jsx-no-new-function-as-prop
										onClick={() => handleRemovePhrase(pid)}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}

				<div className="flex flex-row items-center justify-between gap-2">
					{/* Submit button */}
					<Button type="submit" disabled={createCommentMutation.isPending}>
						{createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
					</Button>

					{/* Add flashcard button */}
					<Dialog open={phraseDialogOpen} onOpenChange={setPhraseDialogOpen}>
						<DialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								disabled={selectedPhraseIds.length >= 4}
							>
								<Paperclip className="mr-2 h-4 w-4" />
								{selectedPhraseIds.length >= 4 ?
									'Maximum flashcards reached'
								:	'Suggest a phrase'}
							</Button>
						</DialogTrigger>
						<DialogContent className="max-h-[80vh] max-w-2xl">
							<DialogHeader>
								<DialogTitle>Select Flashcards</DialogTitle>
							</DialogHeader>
							<SelectPhrasesForComment
								lang={lang}
								selectedPhraseIds={selectedPhraseIds}
								onSelectionChange={setSelectedPhraseIds}
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onDone={() => setPhraseDialogOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				</div>
			</form>
		</Form>
	)
}
