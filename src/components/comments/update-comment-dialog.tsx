import { useState } from 'react'
import { Edit } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MutationButton } from '@/components/ui/mutation-button'
import { RequestCommentSchema, type RequestCommentType } from '@/lib/schemas'
import { Textarea } from '../ui/textarea'
import { commentsCollection } from '@/lib/collections'
import supabase from '@/lib/supabase-client'
import { useMutationWithFeedback } from '@/hooks/use-mutation-feedback'

export function UpdateCommentDialog({
	comment,
}: {
	comment: RequestCommentType
}) {
	const [editContent, setEditContent] = useState(comment.content)

	const [open, setOpen] = useState(false)
	// Update comment mutation with visual feedback
	const mutation = useMutationWithFeedback(
		{
			mutationFn: async (content: string) => {
				const { data, error } = await supabase
					.from('request_comment')
					.update({ content })
					.eq('id', comment.id)
					.select()
					.single()

				if (error) throw error
				return data
			},
			onSuccess: (data: RequestCommentType) => {
				setOpen(false)
				commentsCollection.utils.writeUpdate(RequestCommentSchema.parse(data))
			},
		},
		{
			successMessage: 'Comment updated!',
			errorMessage: (error) => `Failed to update comment: ${error.message}`,
			enableRetry: true,
		}
	)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" title="Update comment">
					<Edit className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Comment</DialogTitle>
					<DialogDescription className="sr-only">
						Edit your comment text below
					</DialogDescription>
				</DialogHeader>
				<div className="mt-2 space-y-2">
					<Textarea
						value={editContent}
						onChange={(e) => setEditContent(e.target.value)}
						rows={4}
					/>
					<div className="flex gap-2">
						<MutationButton
							size="sm"
							onClick={() => mutation.mutate(editContent)}
							{...mutation.buttonProps}
						>
							Save
						</MutationButton>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								setOpen(false)
								setEditContent(comment.content)
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
