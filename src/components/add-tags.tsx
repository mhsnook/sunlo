import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { produce } from 'immer'
import { Pencil } from 'lucide-react'

import type { LanguageLoaded, uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { useLanguagePhrase, useLanguageTags } from '@/hooks/use-language'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MultiSelectCreatable } from '@/components/fields/multi-select-creatable'
import { Tables } from '@/types/supabase'

const addTagsSchema = z.object({
	tags: z.array(z.string()).min(1, 'Select at least one tag to add.'),
})

type AddTagsFormValues = z.infer<typeof addTagsSchema>

export function AddTags({ phraseId, lang }: { phraseId: uuid; lang: string }) {
	const [open, setOpen] = useState(false)
	const { data: allLangTagsData } = useLanguageTags(lang)
	const { data: phrase } = useLanguagePhrase(phraseId, lang)
	const queryClient = useQueryClient()
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<AddTagsFormValues>({
		resolver: zodResolver(addTagsSchema),
		defaultValues: {
			tags: [],
		},
	})

	const addTagsMutation = useMutation({
		mutationFn: async (values: AddTagsFormValues) => {
			if (values.tags.length === 0) return

			const { data, error } = await supabase.rpc('add_tags_to_phrase', {
				p_phrase_id: phraseId,
				p_lang: lang,
				p_tags: values.tags,
			})

			if (error) throw error
			return data as {
				tags: Tables<'tag'>[]
				phrase_tags: Tables<'phrase_tag'>[]
			}
		},
		onSuccess: (_, values) => {
			toast.success('Tags added!')
			if (values.tags.length) {
				void queryClient.setQueryData<LanguageLoaded>(
					['language', lang],
					(old) => {
						return produce(old!, (draft) => {
							const phrase = draft.phrasesMap[phraseId]
							if (!phrase) return
							if (!phrase.tags) phrase.tags = []
							phrase.tags.unshift(
								// this is not the actual id, but the UI doesn't care
								...values.tags.map((t) => ({ name: t, id: t }))
							)
						})
					}
				)
			}
			setOpen(false)
			reset({ tags: [] })
		},
		onError: (error) => {
			console.log(`Failed to add tags: ${error.message}`, error)
			toast.error(`Failed to add tags: ${error.message}`)
		},
	})

	const phraseTags = phrase?.tags ?? []
	// oxlint-disable-next-line prefer-set-has
	const phraseTagNames = phraseTags.map((t) => t.name)
	const allLangTags = allLangTagsData ?? []
	// oxlint-disable-next-line jsx-no-new-array-as-prop
	const availableTags = allLangTags
		.filter((t) => !phraseTagNames.includes(t))
		.map((t) => ({ value: t, label: t }))

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Pencil className="me-2 h-4 w-4" /> Edit tags
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit tags</DialogTitle>
					<DialogDescription>
						Add tags to this phrase to help categorize it.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<h4 className="text-sm font-medium">Current tags</h4>
						<div className="mt-2 flex flex-wrap gap-1">
							{phraseTags.length > 0 ?
								phraseTags.map((tag) => (
									<Badge key={tag.id} variant="secondary">
										{tag.name}
									</Badge>
								))
							:	<p className="text-muted-foreground text-sm italic">
									No tags yet.
								</p>
							}
						</div>
					</div>
					<Separator />
					<form
						id="add-tags-form"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={handleSubmit((data) => addTagsMutation.mutate(data))}
						className="space-y-4"
					>
						<div>
							<h4 className="text-sm font-medium">Add tags</h4>
							<Controller
								control={control}
								name="tags"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								render={({ field }) => (
									<MultiSelectCreatable
										options={availableTags}
										selected={field.value}
										onChange={field.onChange}
										className="mt-2"
									/>
								)}
							/>
							{errors.tags && (
								<p className="text-destructive mt-1 text-sm">
									{errors.tags.message}
								</p>
							)}
						</div>
					</form>
				</div>
				<DialogFooter>
					<Button
						type="submit"
						form="add-tags-form"
						disabled={addTagsMutation.isPending}
					>
						{addTagsMutation.isPending ? 'Saving...' : 'Save changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
