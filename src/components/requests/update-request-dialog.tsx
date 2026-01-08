import { useState } from 'react'
import { Edit } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PhraseRequestSchema, type PhraseRequestType } from '@/lib/schemas'
import { Textarea } from '../ui/textarea'
import { phraseRequestsCollection } from '@/lib/collections'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'

export function UpdateRequestDialog({
	request,
}: {
	request: PhraseRequestType
}) {
	const [editPrompt, setEditPrompt] = useState(request.prompt)

	const [open, setOpen] = useState(false)
	// Update request mutation
	const mutation = useMutation({
		mutationFn: async (prompt: string) => {
			const { data, error } = await supabase
				.from('phrase_request')
				.update({ prompt })
				.eq('id', request.id)
				.select()
				.single()

			if (error) throw error
			return data
		},
		onSuccess: (data: PhraseRequestType) => {
			setOpen(false)
			toast.success('Request updated!')
			phraseRequestsCollection.utils.writeUpdate(
				PhraseRequestSchema.parse(data)
			)
		},
		onError: (error: Error) => {
			toast.error(`Failed to update request: ${error.message}`)
		},
	})

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" title="Update request">
					<Edit className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Request</DialogTitle>
				</DialogHeader>
				<div className="mt-2 space-y-2">
					<Textarea
						value={editPrompt}
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onChange={(e) => setEditPrompt(e.target.value)}
						rows={4}
					/>
					<div className="flex gap-2">
						<Button
							size="sm"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => mutation.mutate(editPrompt)}
							disabled={mutation.isPending}
						>
							{mutation.isPending ? 'Saving...' : 'Save'}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => {
								setOpen(false)
								setEditPrompt(request.prompt)
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
