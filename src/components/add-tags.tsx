import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { uuid } from '@/types/main'
import { Plus } from 'lucide-react'

const addTagsSchema = z.object({
	tags: z.string().min(1, 'Enter at least one tag, comma-separated.'),
})

type AddTagsFormValues = z.infer<typeof addTagsSchema>

export function AddTags({ phraseId, lang }: { phraseId: uuid; lang: string }) {
	const queryClient = useQueryClient()
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<AddTagsFormValues>({
		resolver: zodResolver(addTagsSchema),
	})

	const addTagsMutation = useMutation({
		mutationFn: async ({ tags }: AddTagsFormValues) => {
			const tagsArray = tags
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
			if (tagsArray.length === 0) return

			const { error } = await supabase.rpc('add_tags_to_phrase', {
				p_phrase_id: phraseId,
				p_lang: lang,
				p_tags: tagsArray,
			})

			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Tags added!')
			void queryClient.invalidateQueries({ queryKey: ['languages', lang] })
			reset({ tags: '' })
		},
		onError: (error) => {
			toast.error(`Failed to add tags: ${error.message}`)
		},
	})

	return (
		<form
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onSubmit={handleSubmit(
				addTagsMutation.mutate as SubmitHandler<AddTagsFormValues>
			)}
			className="mt-3 flex items-start gap-2"
		>
			<div className="grow">
				<Input
					{...register('tags')}
					placeholder="Add tags, separated by commas"
				/>
				{errors.tags && (
					<p className="text-destructive mt-1 text-sm">{errors.tags.message}</p>
				)}
			</div>
			<Button
				type="submit"
				size="icon"
				variant="outline"
				disabled={addTagsMutation.isPending}
			>
				<Plus />
			</Button>
		</form>
	)
}
