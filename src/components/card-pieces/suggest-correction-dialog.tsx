import { useRef } from 'react'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { MessageSquareWarning } from 'lucide-react'

import {
	TranslationSuggestionSchema,
	type TranslationType,
} from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import {
	Dialog,
	DialogTrigger,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { translationSuggestionsCollection } from '@/lib/collections'

const SuggestCorrectionInputs = z.object({
	comment: z.string().min(1, 'Please describe the issue or suggestion'),
	text: z.string().optional(),
})
type SuggestCorrectionFormType = z.infer<typeof SuggestCorrectionInputs>

export function SuggestCorrectionDialog({
	translation,
}: {
	translation: TranslationType
}) {
	const {
		handleSubmit,
		register,
		reset,
		formState: { errors, isSubmitting, isValid },
	} = useForm<SuggestCorrectionFormType>({
		defaultValues: {
			comment: '',
			text: '',
		},
		resolver: zodResolver(SuggestCorrectionInputs),
	})
	const closeRef = useRef<HTMLButtonElement | null>(null)
	const close = () => closeRef.current?.click()

	const submitSuggestion = useMutation({
		mutationKey: ['suggest-correction', translation.id],
		mutationFn: async ({ comment, text }: SuggestCorrectionFormType) => {
			const { data } = await supabase
				.from('translation_suggestion')
				.insert({
					translation_id: translation.id,
					phrase_id: translation.phrase_id,
					comment,
					text: text || null,
				})
				.throwOnError()
				.select()
			if (!data) throw new Error('Failed to submit suggestion')
			return data[0]
		},
		onSuccess: (data) => {
			translationSuggestionsCollection.utils.writeInsert(
				TranslationSuggestionSchema.parse(data)
			)
			close()
			reset()
			toastSuccess('Suggestion submitted')
		},
		onError: (error) => {
			toastError(error.message)
			console.log('Error', error)
		},
	})

	return (
		<Dialog>
			<DialogTrigger asChild ref={closeRef}>
				<Button
					size="icon"
					variant="ghost"
					className="size-6"
					title="Suggest a correction"
				>
					<MessageSquareWarning className="size-3" />
				</Button>
			</DialogTrigger>
			<AuthenticatedDialogContent
				authTitle="Login to Suggest Corrections"
				authMessage="You need to be logged in to suggest corrections to translations."
				className="w-[92%] max-w-106"
			>
				<DialogHeader className="text-left">
					<DialogTitle>Suggest a correction</DialogTitle>
					<DialogDescription>
						For the translation &ldquo;{translation.text}&rdquo;
					</DialogDescription>
				</DialogHeader>
				<form
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit((data) => submitSuggestion.mutate(data))}
					noValidate
				>
					<fieldset
						className="mb-4 flex flex-col gap-4"
						disabled={isSubmitting}
					>
						<div className="space-y-2">
							<Label htmlFor="comment">
								What&rsquo;s the issue or improvement?
							</Label>
							<Textarea
								id="comment"
								placeholder="e.g. This translation has a typo, or a more natural phrasing would be..."
								{...register('comment')}
							/>
							{errors.comment && (
								<p className="text-destructive text-sm">
									{errors.comment.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="text">
								Suggested replacement text{' '}
								<span className="text-muted-foreground">(optional)</span>
							</Label>
							<Input
								id="text"
								placeholder="Leave blank if you just want to leave a comment"
								{...register('text')}
							/>
						</div>
					</fieldset>
					<DialogFooter className="flex flex-row justify-between">
						<Button
							type="button"
							disabled={isSubmitting}
							variant="secondary"
							onClick={close}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || !isValid}
							variant="default"
						>
							Submit suggestion
						</Button>
					</DialogFooter>
				</form>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}
