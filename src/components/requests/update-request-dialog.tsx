import { useState } from 'react'
import { Edit } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
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
	PhraseRequestSchema,
	RequestPhraseFormSchema,
	type PhraseRequestType,
	type RequestPhraseFormInputs,
} from '@/features/requests/schemas'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'

export function UpdateRequestDialog({
	request,
}: {
	request: PhraseRequestType
}) {
	const [open, setOpen] = useState(false)

	const form = useForm<RequestPhraseFormInputs>({
		resolver: zodResolver(RequestPhraseFormSchema),
		defaultValues: { prompt: request.prompt },
	})

	const mutation = useMutation({
		mutationFn: async ({ prompt }: RequestPhraseFormInputs) => {
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
			toastSuccess('Request updated!')
			phraseRequestsCollection.utils.writeUpdate(
				PhraseRequestSchema.parse(data)
			)
		},
		onError: (error: Error) => {
			toastError(`Failed to update request: ${error.message}`)
		},
	})

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				if (next) form.reset({ prompt: request.prompt })
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Update request"
					data-testid="update-request-button"
				>
					<Edit className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent data-testid="edit-request-dialog">
				<DialogHeader>
					<DialogTitle>Edit Request</DialogTitle>
					<DialogDescription className="sr-only">
						Edit your request text below
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
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
											data-testid="edit-request-prompt-input"
											rows={4}
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
						<div className="flex gap-2">
							<Button
								size="sm"
								type="submit"
								data-testid="save-request-button"
								disabled={mutation.isPending}
							>
								{mutation.isPending ? 'Saving...' : 'Save'}
							</Button>
							<Button
								size="sm"
								type="button"
								variant="neutral"
								onClick={() => {
									setOpen(false)
									form.reset({ prompt: request.prompt })
								}}
							>
								Cancel
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
