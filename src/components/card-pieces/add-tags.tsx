import { useState } from 'react'
import { createOptimisticAction } from '@tanstack/db'
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
import type { uuid } from '@/types/main'

const addTagsSchema = z.object({
	tags: z.array(z.string()).min(1, 'Select at least one tag to add.'),
})

type AddTagsFormValues = z.infer<typeof addTagsSchema>
type AddTagsRPCReturn = {
	tags: Tables<'tag'>[]
	phrase_tags: Tables<'phrase_tag'>[]
}

type AddTagsInput = {
	phraseId: uuid
	lang: string
	tagNames: string[]
}

const addTagsAction = createOptimisticAction<AddTagsInput>({
	onMutate: ({ phraseId, tagNames }) => {
		// Resolve names to existing tag IDs where possible; otherwise use temp IDs.
		// Synced state will get the real IDs once the RPC returns.
		const langTags = langTagsCollection.toArray as LangTagType[]
		const optimisticTags = tagNames.map((name) => {
			const existing = langTags.find((t) => t.name === name)
			return {
				id: existing?.id ?? crypto.randomUUID(),
				name,
			}
		})
		phrasesCollection.update(phraseId, (draft) => {
			// PhraseFullSchema uses z.preprocess for tags which makes the draft's
			// input type unknown; cast back to the output type.
			const d = draft as unknown as PhraseFullFilteredType
			d.tags = [...(d.tags ?? []), ...optimisticTags]
		})
	},
	mutationFn: async ({ phraseId, lang, tagNames }) => {
		const { data, error } = await supabase.rpc('add_tags_to_phrase', {
			p_phrase_id: phraseId,
			p_lang: lang,
			p_tags: tagNames,
		})
		if (error) throw error
		const result = data as AddTagsRPCReturn
		for (const t of result.tags) {
			langTagsCollection.utils.writeInsert(LangTagSchema.parse(t))
		}
		const serverTags = result.phrase_tags
			.map((pt) => langTagsCollection.get(pt.tag_id))
			.filter(Boolean) as LangTagType[]
		const serverTagPairs = serverTags.map((t) => ({ id: t.id, name: t.name }))

		const current = phrasesCollection.get(phraseId)
		if (!current) return
		// current.tags is optimistic-merged: contains temp entries we added.
		// Dedupe by name so temps get replaced by real-ID server entries.
		const newNames = new Set(serverTagPairs.map((t) => t.name))
		const filteredCurrent = current.tags.filter((t) => !newNames.has(t.name))
		phrasesCollection.utils.writeUpdate({
			id: phraseId,
			tags: [...filteredCurrent, ...serverTagPairs],
		})
	},
})

type RemoveTagInput = {
	phraseId: uuid
	tagId: uuid
}

const removeTagAction = createOptimisticAction<RemoveTagInput>({
	onMutate: ({ phraseId, tagId }) => {
		phrasesCollection.update(phraseId, (draft) => {
			const d = draft as unknown as PhraseFullFilteredType
			d.tags = d.tags.filter((t) => t.id !== tagId)
		})
	},
	mutationFn: async ({ phraseId, tagId }) => {
		await supabase
			.from('phrase_tag')
			.delete()
			.eq('phrase_id', phraseId)
			.eq('tag_id', tagId)
			.throwOnError()
		const current = phrasesCollection.get(phraseId)
		if (!current) return
		phrasesCollection.utils.writeUpdate({
			id: phraseId,
			tags: current.tags.filter((t) => t.id !== tagId),
		})
	},
})

export function AddTags({
	phrase,
	allowRemove = false,
}: {
	phrase: PhraseFullFilteredType
	allowRemove?: boolean
}) {
	const [open, setOpen] = useState(false)
	const { data: allLangTags } = useLanguageTags(phrase?.lang)

	const form = useAppForm({
		defaultValues: { tags: [] } as AddTagsFormValues,
		validators: { onChange: addTagsSchema },
		onSubmit: async ({ value }: { value: AddTagsFormValues }) => {
			if (value.tags.length === 0) return
			try {
				const tx = addTagsAction({
					phraseId: phrase.id,
					lang: phrase.lang,
					tagNames: value.tags,
				})
				await tx.isPersisted.promise
				setOpen(false)
				form.reset()
				toastSuccess('Tags added!')
			} catch (err) {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to add tags: ${message}`)
				console.error('Add tags rolled back:', err)
			}
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
}: {
	tag: { id: string; name: string }
	phraseId: string
}) {
	const handleRemove = () => {
		const tx = removeTagAction({ phraseId, tagId: tag.id })
		tx.isPersisted.promise.then(
			() => toastSuccess(`Tag "${tag.name}" removed`),
			(err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to remove tag: ${message}`)
				console.error('Remove tag rolled back:', err)
			}
		)
	}

	return (
		<Badge variant="secondary" className="gap-1">
			{tag.name}
			<button
				onClick={handleRemove}
				className="hover:text-destructive -me-1 rounded-full p-0.5"
			>
				<X className="size-3" />
			</button>
		</Badge>
	)
}
