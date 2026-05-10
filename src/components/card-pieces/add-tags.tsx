import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { Tags, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { useLanguageTags } from '@/features/languages/hooks'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MultiSelectCreatable } from '@/components/fields/multi-select-creatable'
import { langTagsCollection } from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { LangTagSchema, LangTagType } from '@/features/languages/schemas'
import { PhraseFullFilteredType } from '@/features/phrases/schemas'
import { Tables } from '@/types/supabase'
import { useAppForm } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'

const addTagsSchema = z.object({
	tags: z.array(z.string()).min(1, 'Select at least one tag to add.'),
})

type AddTagsFormValues = z.infer<typeof addTagsSchema>
type AddTagsReturnValues = {
	tags: Tables<'tag'>[]
	phrase_tags: Tables<'phrase_tag'>[]
}

export function AddTags({
	phrase,
	allowRemove = false,
}: {
	phrase: PhraseFullFilteredType
	allowRemove?: boolean
}) {
	const [open, setOpen] = useState(false)
	const { data: allLangTags } = useLanguageTags(phrase?.lang)

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
				const langTags = data.phrase_tags
					.map((t) => langTagsCollection.get(t.tag_id))
					.filter(Boolean) as LangTagType[]
				phrasesCollection.utils.writeUpdate({
					id: phrase.id,
					tags: [
						...(phrase.tags ?? []),
						...(langTags.map((t) => ({ id: t.id, name: t.name })) ?? []),
					],
				})
			}
			setOpen(false)
			form.reset()
			toastSuccess('Tags added!')
		},
		onError: (error) => {
			console.log(`Failed to add tags: ${error.message}`, error)
			toastError(`Failed to add tags: ${error.message}`)
		},
	})

	const form = useAppForm({
		defaultValues: { tags: [] } as AddTagsFormValues,
		validators: { onChange: addTagsSchema },
		onSubmit: async ({ value }) => {
			await addTagsMutation.mutateAsync(value)
		},
	})

	// oxlint-disable-next-line prefer-set-has
	const phraseTagNames = phrase.tags?.map((t) => t.name) ?? []

	const availableTags = (allLangTags ?? [])
		.filter((t) => !phraseTagNames.includes(t.name))
		.map((t) => ({ value: t.name, label: t.name }))

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Edit tags"
					data-testid="add-tags-trigger"
				>
					<Tags />
				</Button>
			</DialogTrigger>
			<AuthenticatedDialogContent
				authTitle="Login to Edit Tags"
				authMessage="You need to be logged in to add tags to phrases."
				className="sm:max-w-106"
				data-testid="add-tags-dialog"
			>
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
							{phrase.tags?.length ? (
								phrase.tags.map((tag) =>
									allowRemove ? (
										<RemovableTagBadge
											key={tag.id}
											tag={tag}
											phraseId={phrase.id}
											phraseTags={phrase.tags ?? []}
										/>
									) : (
										<Badge key={tag.id} variant="secondary">
											{tag.name}
										</Badge>
									)
								)
							) : (
								<p className="text-muted-foreground text-sm italic">
									No tags yet.
								</p>
							)}
						</div>
					</div>
					<Separator />
					<form
						id="add-tags-form"
						data-testid="add-tags-form"
						noValidate
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
							void form.handleSubmit()
						}}
						className="space-y-4"
					>
						<div>
							<h4 className="text-sm font-medium">Add tags</h4>
							<form.AppField name="tags">
								{(field) => {
									const meta = field.state.meta
									const showError = meta.isBlurred && meta.errors.length > 0
									return (
										<>
											<MultiSelectCreatable
												options={availableTags}
												selected={field.state.value}
												onChange={(next) => {
													field.handleChange(next)
													field.handleBlur()
												}}
												className="mt-2"
											/>
											{showError && <ErrorList errors={meta.errors} />}
										</>
									)
								}}
							</form.AppField>
						</div>
					</form>
				</div>
				<DialogFooter>
					<form.AppForm>
						<form.SubmitButton form="add-tags-form" pendingText="Saving...">
							Save changes
						</form.SubmitButton>
					</form.AppForm>
				</DialogFooter>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

function RemovableTagBadge({
	tag,
	phraseId,
	phraseTags,
}: {
	tag: { id: string; name: string }
	phraseId: string
	phraseTags: Array<{ id: string; name: string }>
}) {
	const removeTag = useMutation({
		mutationFn: async () => {
			await supabase
				.from('phrase_tag')
				.delete()
				.eq('phrase_id', phraseId)
				.eq('tag_id', tag.id)
				.throwOnError()
		},
		onSuccess: () => {
			phrasesCollection.utils.writeUpdate({
				id: phraseId,
				tags: phraseTags.filter((t) => t.id !== tag.id),
			})
			toastSuccess(`Tag "${tag.name}" removed`)
		},
		onError: (error) => {
			toastError('Failed to remove tag')
			console.error(error)
		},
	})

	return (
		<Badge variant="secondary" className="gap-1">
			{tag.name}
			<button
				onClick={() => removeTag.mutate()}
				disabled={removeTag.isPending}
				className="hover:text-destructive -me-1 rounded-full p-0.5"
			>
				<X className="size-3" />
			</button>
		</Badge>
	)
}
