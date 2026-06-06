import { useState } from 'react'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { Tags, X } from 'lucide-react'
import { createOptimisticAction } from '@tanstack/db'

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
import { phraseTagLinksCollection } from '@/features/phrases/collections'
import { PhraseFullFilteredType } from '@/features/phrases/schemas'
import { useUserId } from '@/lib/use-auth'
import { useAppForm } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'

const addTagsSchema = z.object({
	tags: z.array(z.string()).min(1, 'Select at least one tag to add.'),
})

type AddTagsFormValues = z.infer<typeof addTagsSchema>

// Pre-resolved tag inputs: the caller decides which names map to existing
// tag IDs and which need a fresh uuid, so both optimistic and persistent
// stages use the same IDs.
type AddTagsAction = {
	phraseId: string
	lang: string
	uid: string
	tags: Array<{ tagId: string; name: string; isNew: boolean }>
}

const addTagsAction = createOptimisticAction<AddTagsAction>({
	onMutate: ({ phraseId, lang, uid, tags }) => {
		const now = new Date().toISOString()
		for (const t of tags) {
			if (t.isNew) {
				langTagsCollection.insert({
					id: t.tagId,
					name: t.name,
					lang,
					added_by: uid,
					created_at: now,
				})
			}
			phraseTagLinksCollection.insert({
				phrase_id: phraseId,
				tag_id: t.tagId,
				added_by: uid,
				created_at: now,
			})
		}
	},
	mutationFn: async ({ phraseId, lang, uid, tags }) => {
		// New tags first — phrase_tag links FK into tag.id.
		const newRows = tags
			.filter((t) => t.isNew)
			.map((t) => ({ id: t.tagId, name: t.name, lang, added_by: uid }))
		if (newRows.length) {
			await supabase.from('tag').insert(newRows).throwOnError()
		}
		const linkRows = tags.map((t) => ({
			phrase_id: phraseId,
			tag_id: t.tagId,
			added_by: uid,
		}))
		if (linkRows.length) {
			await supabase.from('phrase_tag').insert(linkRows).throwOnError()
		}
	},
})

export function AddTags({
	phrase,
	allowRemove = false,
}: {
	phrase: PhraseFullFilteredType
	allowRemove?: boolean
}) {
	const userId = useUserId()
	const [open, setOpen] = useState(false)
	const { data: allLangTags } = useLanguageTags(phrase?.lang)

	const handleSubmit = (values: AddTagsFormValues) => {
		if (!userId || values.tags.length === 0) return
		const resolved: AddTagsAction['tags'] = values.tags.map((name) => {
			const existing = (allLangTags ?? []).find((t) => t.name === name)
			return {
				tagId: existing?.id ?? crypto.randomUUID(),
				name,
				isNew: !existing,
			}
		})
		const tx = addTagsAction({
			phraseId: phrase.id,
			lang: phrase.lang,
			uid: userId,
			tags: resolved,
		})
		setOpen(false)
		form.reset()
		tx.isPersisted.promise.then(
			() => toastSuccess('Tags added!'),
			(err: Error) => {
				toastError(`Failed to add tags: ${err.message}`)
				console.log(`Rolled back add-tags`, err)
			}
		)
	}

	const form = useAppForm({
		defaultValues: { tags: [] } as AddTagsFormValues,
		validators: { onChange: addTagsSchema },
		onSubmit: ({ value }) => {
			handleSubmit(value)
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
	const removeTag = () => {
		const tx = phraseTagLinksCollection.delete(`${phraseId}--${tag.id}`)
		tx.isPersisted.promise.then(
			() => toastSuccess(`Tag "${tag.name}" removed`),
			(err: Error) => {
				toastError('Failed to remove tag')
				console.log(`Rolled back tag removal`, err)
			}
		)
	}

	return (
		<Badge variant="secondary" className="gap-1">
			{tag.name}
			<button
				onClick={removeTag}
				className="hover:text-destructive -me-1 rounded-full p-0.5"
			>
				<X className="size-3" />
			</button>
		</Badge>
	)
}
