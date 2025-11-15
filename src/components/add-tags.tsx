import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { Pencil } from 'lucide-react'

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
import { useLanguageTags } from '@/hooks/use-language'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MultiSelectCreatable } from '@/components/fields/multi-select-creatable'
import { langTagsCollection, phrasesCollection } from '@/lib/collections'
import {
	LangTagSchema,
	LangTagType,
	PhraseFullFilteredType,
} from '@/lib/schemas'
import { Tables } from '@/types/supabase'

const addTagsSchema = z.object({
	tags: z.array(z.string()).min(1, 'Select at least one tag to add.'),
})

type AddTagsFormValues = z.infer<typeof addTagsSchema>
type AddTagsReturnValues = {
	tags: Tables<'tag'>[]
	phrase_tags: Tables<'phrase_tag'>[]
}

export function AddTags({ phrase }: { phrase: PhraseFullFilteredType }) {
	const [open, setOpen] = useState(false)
	const { data: allLangTags } = useLanguageTags(phrase?.lang)
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
			console.log(`Running addTagsMutation fn`, { values, allLangTags })
			if (values.tags.length === 0) return

			const { data, error } = await supabase.rpc('add_tags_to_phrase', {
				p_phrase_id: phrase.id,
				p_lang: phrase.lang,
				p_tags: values.tags,
			})

			if (error) throw error
			return data as AddTagsReturnValues
		},
		onSuccess: (data) => {
			if (data?.tags.length) {
				data?.tags.map((t) => {
					langTagsCollection.utils.writeInsert(LangTagSchema.parse(t))
				})
			}
			if (data?.phrase_tags.length) {
				const langTags =
					data.phrase_tags
						.map((t) => langTagsCollection.get(t.tag_id))
						.filter((t): t is LangTagType => !!t) ?? []
				phrasesCollection.utils.writeUpdate({
					id: phrase.id,
					tags: [
						...(phrase.tags ?? []),
						...(langTags.map((t) => ({ id: t.id, name: t.name })) ?? []),
					],
				})
			}
			toast.success('Tags added!')
			setOpen(false)
			reset({ tags: [] })
		},
		onError: (error) => {
			console.log(`Failed to add tags: ${error.message}`, error)
			toast.error(`Failed to add tags: ${error.message}`)
		},
	})

	// oxlint-disable-next-line prefer-set-has
	const phraseTagNames = phrase.tags?.map((t) => t.name) ?? []
	// oxlint-disable-next-line jsx-no-new-array-as-prop
	const availableTags = allLangTags
		.filter((t) => !phraseTagNames.includes(t.name))
		.map((t) => ({ value: t.name, label: t.name }))

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
							{phrase.tags?.length ?
								phrase.tags.map((tag) => (
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
