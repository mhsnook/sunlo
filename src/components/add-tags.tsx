import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LanguageLoaded, Tag, uuid } from '@/types/main'
import { Save } from 'lucide-react'

const addTagsSchema = z.object({
	tags: z.string().min(1, 'Enter at least one tag, comma-separated.'),
})

type AddTagsFormValues = z.infer<typeof addTagsSchema>

export function AddTags({
	phraseId,
	lang,
	onSuccess,
}: {
	phraseId: uuid
	lang: string
	onSuccess: () => void
}) {
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

			const { data, error } = await supabase.rpc('add_tags_to_phrase', {
				p_phrase_id: phraseId,
				p_lang: lang,
				p_tags: tagsArray,
			})

			if (error) throw error
			return { tagsToAddToPhrase: tagsArray, tagsAddedToLang: data }
		},
		onSuccess: ({
			tagsToAddToPhrase,
			tagsAddedToLang,
		}: {
			tagsToAddToPhrase: string[]
			tagsAddedToLang: Tag[]
		}) => {
			toast.success('Tags added!')
			queryClient.setQueryData(
				['language', lang],
				(oldData: LanguageLoaded) => {
					const newData = {
						...oldData,
						phrasesMap: {
							...oldData?.phrasesMap,
							[phraseId]: {
								...oldData?.phrasesMap[phraseId],
								tags: [
									...(oldData?.phrasesMap[phraseId]?.tags ?? []),
									...tagsToAddToPhrase.map((d) => ({ id: d, name: d })),
								],
							},
						},
					}

					if (tagsAddedToLang.length) {
						const newTagNames = tagsAddedToLang.map((t) => t.name)
						newData.meta.tags = [
							...(oldData.meta.tags ?? []),
							...newTagNames,
						].filter((t, i, a) => a.indexOf(t) === i)
					}

					return newData
				}
			)
			onSuccess()
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
				variant="outline"
				disabled={addTagsMutation.isPending}
			>
				<Save /> Add
			</Button>
		</form>
	)
}
