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

const ReplyFormSchema = z.object({
	content: z
		.string()
		.min(1, 'Please enter a reply')
		.max(1000, 'Reply must be less than 1000 characters'),
})

type ReplyFormInputs = z.infer<typeof ReplyFormSchema>

interface AddReplyFormProps {
	parentCommentId: uuid
	requestId: uuid
	lang: string
	onCancel?: () => void
}

export function AddReplyForm({
	parentCommentId,
	requestId,
	lang,
	onCancel,
}: AddReplyFormProps) {
	const [selectedPhraseIds, setSelectedPhraseIds] = useState<uuid[]>([])
	const [phraseDialogOpen, setPhraseDialogOpen] = useState(false)

	const form = useForm<ReplyFormInputs>({
		resolver: zodResolver(ReplyFormSchema),
		defaultValues: {
			content: '',
		},
	})

	const createReplyMutation = useMutation({
		mutationFn: async (values: ReplyFormInputs) => {
			const { data, error } = await supabase.rpc(
				'create_comment_with_phrases',
				{
					p_request_id: requestId,
					p_content: values.content,
					p_parent_comment_id: parentCommentId,
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
			toast.success('Reply posted!')
			onCancel?.()
		},
		onError: (error: Error) => {
			toast.error(`Failed to post reply: ${error.message}`)
		},
	})

	const handleRemovePhrase = (phraseId: uuid) => {
		setSelectedPhraseIds((prev) => prev.filter((id) => id !== phraseId))
	}

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => createReplyMutation.mutate(data))}
				className="space-y-3"
			>
				<FormField
					control={form.control}
					name="content"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Textarea placeholder="Write a reply..." rows={3} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Attached flashcards */}
				{selectedPhraseIds && selectedPhraseIds.length > 0 && (
					<div className="space-y-2">
						<div className="space-y-2">
							{selectedPhraseIds.map((pid) => (
								<div
									key={pid}
									className="bg-muted relative flex items-start gap-2 rounded-lg p-2"
								>
									<div className="flex-1">
										<PhraseTinyCard pid={pid} />
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-6 w-6"
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

				<div className="flex flex-row justify-between gap-2">
					{/* Submit and cancel buttons */}
					<div className="flex flex-row gap-2">
						<Button
							type="submit"
							size="sm"
							disabled={createReplyMutation.isPending}
						>
							{createReplyMutation.isPending ? 'Posting...' : 'Post Reply'}
						</Button>

						{onCancel && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={onCancel}
							>
								Cancel
							</Button>
						)}
					</div>
					{/* Add flashcard button */}
					<Dialog open={phraseDialogOpen} onOpenChange={setPhraseDialogOpen}>
						<DialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={selectedPhraseIds.length >= 4}
							>
								<Paperclip className="mr-2 h-4 w-4" />
								Suggest a phrase{' '}
								{selectedPhraseIds.length ?
									`(${selectedPhraseIds.length}/4)`
								:	''}
							</Button>
						</DialogTrigger>
						<DialogContent className="max-h-[80vh] max-w-2xl">
							<DialogHeader>
								<DialogTitle>Select Phrases</DialogTitle>
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
