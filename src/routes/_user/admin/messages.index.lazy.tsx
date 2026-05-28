import { useId, useMemo, useState } from 'react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
	Archive,
	Check,
	ChevronsUpDown,
	ExternalLink,
	Pencil,
	Plus,
	Search,
	Tags,
	Undo2,
	X,
} from 'lucide-react'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge, LangBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Textarea } from '@/components/ui/textarea'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { SelectOneLanguage } from '@/components/select-one-language'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { ago } from '@/lib/dayjs'
import { useAuth } from '@/lib/use-auth'
import supabase from '@/lib/supabase-client'
import {
	messageTagLinksCollection,
	messageTagsCollection,
	messagesCollection,
	phraseRequestsCollection,
} from '@/features/requests/collections'
import {
	MessageTagLinkSchema,
	PhraseRequestSchema,
	type MessageTagType,
} from '@/features/requests/schemas'

export const Route = createLazyFileRoute('/_user/admin/messages/')({
	component: AdminMessagesPage,
})

type MessageRow = {
	message_id: string
	created_at: string
	prompt: string
	lang: string
	request_id: string
}

function AdminMessagesPage() {
	const { userId } = useAuth()
	const [search, setSearch] = useState('')
	const [activeTagSlug, setActiveTagSlug] = useState<string | null>(null)
	const [selected, setSelected] = useState<Set<string>>(new Set())

	const { data: rawRows, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ msg: messagesCollection })
				.join(
					{ req: phraseRequestsCollection },
					({ msg, req }) => eq(req.message_id, msg.id),
					'inner'
				)
				.orderBy(({ msg }) => msg.created_at, 'desc')
				.select(({ msg, req }) => ({
					message_id: msg.id,
					created_at: msg.created_at,
					prompt: req.prompt,
					lang: req.lang,
					request_id: req.id,
				})),
		[]
	)

	const { data: allTags } = useLiveQuery(
		(q) =>
			q
				.from({ tag: messageTagsCollection })
				.where(({ tag }) => eq(tag.archived, false))
				.orderBy(({ tag }) => tag.sort_order, 'asc'),
		[]
	)

	const { data: allLinks } = useLiveQuery(
		(q) => q.from({ link: messageTagLinksCollection }),
		[]
	)

	const tagsByMessage = useMemo(() => {
		const tagBySlug = new Map(allTags?.map((t) => [t.slug, t]) ?? [])
		const out = new Map<string, MessageTagType[]>()
		for (const link of allLinks ?? []) {
			const tag = tagBySlug.get(link.tag_slug)
			if (!tag) continue
			const arr = out.get(link.message_id) ?? []
			arr.push(tag)
			out.set(link.message_id, arr)
		}
		for (const arr of out.values()) {
			arr.sort((a, b) => a.sort_order - b.sort_order)
		}
		return out
	}, [allTags, allLinks])

	const tagCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const link of allLinks ?? []) {
			counts.set(link.tag_slug, (counts.get(link.tag_slug) ?? 0) + 1)
		}
		return counts
	}, [allLinks])

	const rows: MessageRow[] = useMemo(() => {
		const all = (rawRows ?? []) as MessageRow[]
		const messageIdsForTag =
			activeTagSlug == null
				? null
				: new Set(
						(allLinks ?? [])
							.filter((l) => l.tag_slug === activeTagSlug)
							.map((l) => l.message_id)
					)
		const q = search.trim().toLowerCase()
		return all.filter((r) => {
			if (messageIdsForTag && !messageIdsForTag.has(r.message_id)) return false
			if (q && !r.prompt.toLowerCase().includes(q)) return false
			return true
		})
	}, [rawRows, allLinks, activeTagSlug, search])

	const toggleSelected = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleVisibleAll = () => {
		setSelected((prev) => {
			const next = new Set(prev)
			const allVisibleSelected = rows.every((r) => next.has(r.message_id))
			if (allVisibleSelected) {
				for (const r of rows) next.delete(r.message_id)
			} else {
				for (const r of rows) next.add(r.message_id)
			}
			return next
		})
	}

	return (
		<div className="space-y-6" data-testid="admin-messages-page">
			<header className="space-y-1">
				<h1 className="text-2xl font-bold">Messages</h1>
				<p className="text-muted-foreground text-sm">
					Each message is the cross-language thing behind a request. Tag, edit
					vocabulary, and bulk-add seed content.
				</p>
			</header>

			<TagsStrip
				allTags={allTags ?? []}
				tagCounts={tagCounts}
				activeTagSlug={activeTagSlug}
				setActiveTagSlug={setActiveTagSlug}
			/>

			<BulkAddSection userId={userId} allTags={allTags ?? []} />

			<div className="space-y-3">
				<div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between">
					<div className="relative max-w-md grow">
						<Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
						<Input
							placeholder="Filter by request text..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="ps-9"
							data-testid="admin-messages-search"
						/>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<p className="text-muted-foreground text-sm">
							{rows.length} of {rawRows?.length ?? 0}
						</p>
					</div>
				</div>

				{selected.size > 0 && (
					<SelectionBar
						selected={selected}
						clear={() => setSelected(new Set())}
						allTags={allTags ?? []}
					/>
				)}

				{isLoading ? (
					<Loader />
				) : (
					<MessagesTable
						rows={rows}
						selected={selected}
						toggleSelected={toggleSelected}
						toggleVisibleAll={toggleVisibleAll}
						tagsByMessage={tagsByMessage}
					/>
				)}
			</div>
		</div>
	)
}

function TagsStrip({
	allTags,
	tagCounts,
	activeTagSlug,
	setActiveTagSlug,
}: {
	allTags: MessageTagType[]
	tagCounts: Map<string, number>
	activeTagSlug: string | null
	setActiveTagSlug: (slug: string | null) => void
}) {
	return (
		<section
			className="space-y-2"
			aria-label="Tag filter"
			data-testid="admin-messages-tags-strip"
		>
			<div className="flex items-center justify-between">
				<h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
					Tags
				</h2>
				<div className="flex items-center gap-1">
					<EditTagsDialog tagCounts={tagCounts} />
					<NewTagButton />
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() => setActiveTagSlug(null)}
					className={cn(
						buttonVariants({
							variant: activeTagSlug == null ? 'soft' : 'ghost',
							size: 'sm',
						})
					)}
					data-testid="tag-filter-all"
				>
					All
				</button>
				{allTags.map((tag) => (
					<button
						key={tag.slug}
						type="button"
						onClick={() =>
							setActiveTagSlug(activeTagSlug === tag.slug ? null : tag.slug)
						}
						className={cn(
							buttonVariants({
								variant: activeTagSlug === tag.slug ? 'soft' : 'ghost',
								size: 'sm',
							}),
							'gap-1'
						)}
						data-testid="tag-filter-chip"
						data-key={tag.slug}
					>
						{tag.label}
						<span className="text-muted-foreground text-xs">
							({tagCounts.get(tag.slug) ?? 0})
						</span>
					</button>
				))}
			</div>
		</section>
	)
}

function NewTagButton() {
	const [open, setOpen] = useState(false)
	const [slug, setSlug] = useState('')
	const [label, setLabel] = useState('')
	const [description, setDescription] = useState('')
	const slugId = useId()
	const labelId = useId()
	const descId = useId()

	const submit = () => {
		const cleanSlug = slug.trim()
		const cleanLabel = label.trim()
		if (!cleanSlug || !cleanLabel) {
			toastError('Slug and label are required')
			return
		}
		const tx = messageTagsCollection.insert({
			slug: cleanSlug,
			label: cleanLabel,
			description: description.trim() || null,
			sort_order: 999,
			created_at: new Date().toISOString(),
		})
		tx.isPersisted.promise.then(
			() => {
				toastSuccess(`Created tag "${cleanLabel}"`)
				setSlug('')
				setLabel('')
				setDescription('')
				setOpen(false)
			},
			(err: unknown) => {
				toastError('Failed to create tag')
				console.error(err)
			}
		)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button size="sm" variant="ghost" data-testid="new-tag-button">
					<Plus className="me-1 h-3 w-3" /> New tag
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 space-y-3">
				<div className="space-y-1">
					<label htmlFor={slugId} className="text-muted-foreground text-xs">
						Slug (immutable)
					</label>
					<Input
						id={slugId}
						value={slug}
						onChange={(e) => setSlug(e.target.value)}
						placeholder="kebab-case-slug"
						data-testid="new-tag-slug"
					/>
				</div>
				<div className="space-y-1">
					<label htmlFor={labelId} className="text-muted-foreground text-xs">
						Label
					</label>
					<Input
						id={labelId}
						value={label}
						onChange={(e) => setLabel(e.target.value)}
						placeholder="Display label"
						data-testid="new-tag-label"
					/>
				</div>
				<div className="space-y-1">
					<label htmlFor={descId} className="text-muted-foreground text-xs">
						Description (optional)
					</label>
					<Textarea
						id={descId}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="min-h-[60px]"
						data-testid="new-tag-description"
					/>
				</div>
				<div className="flex justify-end gap-2">
					<Button size="sm" variant="neutral" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button size="sm" onClick={submit} data-testid="new-tag-submit">
						Create
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}

function EditTagsDialog({ tagCounts }: { tagCounts: Map<string, number> }) {
	const [open, setOpen] = useState(false)
	const { data: tagsIncludingArchived } = useLiveQuery(
		(q) =>
			q
				.from({ tag: messageTagsCollection })
				.orderBy(({ tag }) => tag.archived, 'asc')
				.orderBy(({ tag }) => tag.sort_order, 'asc'),
		[]
	)
	const rows = tagsIncludingArchived ?? []
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost" data-testid="edit-tags-button">
					<Pencil className="me-1 h-3 w-3" /> Edit tags
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit tags</DialogTitle>
					<DialogDescription>
						Rename labels, edit descriptions, or archive retired tags. Archived
						tags stay in the database but disappear from pickers and public
						chips. Slugs are immutable.
					</DialogDescription>
				</DialogHeader>
				{rows.length === 0 ? (
					<p className="text-muted-foreground py-4 text-center text-sm italic">
						No tags yet.
					</p>
				) : (
					<ul className="divide-y" data-testid="edit-tags-list">
						{rows.map((tag) => (
							<TagAdminRow
								key={tag.slug}
								tag={tag}
								count={tagCounts.get(tag.slug) ?? 0}
							/>
						))}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	)
}

function TagAdminRow({ tag, count }: { tag: MessageTagType; count: number }) {
	const [isEditing, setIsEditing] = useState(false)
	const [label, setLabel] = useState(tag.label)
	const [description, setDescription] = useState(tag.description ?? '')
	const [confirmingDelete, setConfirmingDelete] = useState(false)
	const labelId = useId()
	const descId = useId()

	const save = () => {
		const trimmedLabel = label.trim()
		if (!trimmedLabel) {
			toastError('Label is required')
			return
		}
		const tx = messageTagsCollection.update(tag.slug, (draft) => {
			draft.label = trimmedLabel
			draft.description = description.trim() || null
		})
		tx.isPersisted.promise.then(
			() => {
				toastSuccess(`Updated ${tag.slug}`)
				setIsEditing(false)
			},
			(err: unknown) => {
				toastError('Failed to update tag')
				console.error(err)
			}
		)
	}

	const cancel = () => {
		setLabel(tag.label)
		setDescription(tag.description ?? '')
		setIsEditing(false)
	}

	const toggleArchive = () => {
		const tx = messageTagsCollection.update(tag.slug, (draft) => {
			draft.archived = !tag.archived
		})
		tx.isPersisted.promise.then(
			() => {
				toastSuccess(
					tag.archived ? `Restored "${tag.slug}"` : `Archived "${tag.slug}"`
				)
				setConfirmingDelete(false)
			},
			(err: unknown) => {
				toastError(
					tag.archived ? 'Failed to restore tag' : 'Failed to archive tag'
				)
				console.error(err)
			}
		)
	}

	return (
		<li
			className={cn('py-3', tag.archived && 'opacity-60')}
			data-testid="edit-tag-row"
			data-key={tag.slug}
		>
			{isEditing ? (
				<div className="space-y-2">
					<p className="text-muted-foreground font-mono text-xs">{tag.slug}</p>
					<div className="space-y-1">
						<label htmlFor={labelId} className="text-muted-foreground text-xs">
							Label
						</label>
						<Input
							id={labelId}
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							data-testid="edit-tag-label"
							onKeyDown={(e) => {
								if (e.key === 'Enter') save()
								if (e.key === 'Escape') cancel()
							}}
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor={descId} className="text-muted-foreground text-xs">
							Description
						</label>
						<Textarea
							id={descId}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="min-h-[60px]"
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							size="icon"
							variant="ghost"
							onClick={save}
							aria-label="Save"
							data-testid="edit-tag-save"
						>
							<Check className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							onClick={cancel}
							aria-label="Cancel"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>
			) : (
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex items-baseline gap-2">
							<span className="font-semibold">{tag.label}</span>
							<span className="text-muted-foreground text-xs">({count})</span>
							{tag.archived ? (
								<Badge variant="secondary" className="gap-1 text-xs">
									<Archive className="size-3" /> Archived
								</Badge>
							) : null}
						</div>
						<p className="text-muted-foreground font-mono text-xs">
							{tag.slug}
						</p>
						{tag.description ? (
							<p className="text-muted-foreground mt-1 text-sm">
								{tag.description}
							</p>
						) : null}
					</div>
					<div className="flex shrink-0 gap-1">
						<Button
							size="icon"
							variant="ghost"
							onClick={() => setIsEditing(true)}
							aria-label={`Edit ${tag.label}`}
							data-testid="edit-tag-pencil"
						>
							<Pencil className="size-3.5" />
						</Button>
						{tag.archived ? (
							<Button
								size="icon"
								variant="ghost"
								onClick={toggleArchive}
								aria-label={`Restore ${tag.label}`}
								data-testid="restore-tag-button"
							>
								<Undo2 className="size-3.5" />
							</Button>
						) : (
							<AlertDialog
								open={confirmingDelete}
								onOpenChange={setConfirmingDelete}
							>
								<AlertDialogTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										aria-label={`Archive ${tag.label}`}
										data-testid="archive-tag-button"
									>
										<Archive className="text-destructive size-3.5" />
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Archive tag &ldquo;{tag.label}&rdquo;?
										</AlertDialogTitle>
										<AlertDialogDescription>
											{count > 0
												? `This tag will disappear from filters, pickers, and public chips on ${count} message${count === 1 ? '' : 's'}. The link rows stay in the database — restore later to bring them back.`
												: 'This tag is not in use. You can restore it later.'}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={toggleArchive}
											data-testid="archive-tag-confirm"
										>
											Archive
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
					</div>
				</div>
			)}
		</li>
	)
}

function BulkAddSection({
	userId,
	allTags,
}: {
	userId: string | null
	allTags: MessageTagType[]
}) {
	const [open, setOpen] = useState(false)
	const [text, setText] = useState('')
	const [lang, setLang] = useState('')
	const [tagSlug, setTagSlug] = useState<string | null>(null)
	const [tagPickerOpen, setTagPickerOpen] = useState(false)

	const prompts = useMemo(
		() =>
			text
				.split(/\n\s*\n/)
				.map((s) => s.trim())
				.filter((s) => s.length > 0),
		[text]
	)

	const selectedTag = allTags.find((t) => t.slug === tagSlug) ?? null

	const bulkAdd = useMutation({
		mutationFn: async () => {
			if (!userId) throw new Error('Not authenticated')
			if (!lang) throw new Error('Pick a language first')
			if (prompts.length === 0) throw new Error('No prompts to add')
			const { data: requests } = await supabase
				.from('phrase_request')
				.insert(
					prompts.map((prompt) => ({
						prompt,
						lang,
						requester_uid: userId,
					}))
				)
				.select()
				.throwOnError()
			const insertedRequests = requests ?? []

			let insertedLinks: { message_id: string; tag_slug: string }[] = []
			if (tagSlug && insertedRequests.length > 0) {
				const { data: links } = await supabase
					.from('message_tag_link')
					.insert(
						insertedRequests
							.filter((r) => r.message_id)
							.map((r) => ({
								message_id: r.message_id as string,
								tag_slug: tagSlug,
							}))
					)
					.select()
					.throwOnError()
				insertedLinks = links ?? []
			}
			return { requests: insertedRequests, links: insertedLinks }
		},
		onSuccess: ({ requests, links }) => {
			for (const row of requests) {
				const parsed = PhraseRequestSchema.parse(row)
				phraseRequestsCollection.utils.writeInsert(parsed)
				if (parsed.message_id) {
					messagesCollection.utils.writeInsert({
						id: parsed.message_id,
						created_at: parsed.created_at,
					})
				}
			}
			for (const link of links) {
				messageTagLinksCollection.utils.writeInsert(
					MessageTagLinkSchema.parse(link)
				)
			}
			toastSuccess(
				`Added ${requests.length} message${requests.length === 1 ? '' : 's'}` +
					(tagSlug ? ` tagged "${tagSlug}"` : '')
			)
			setText('')
		},
		onError: (err: unknown) => {
			toastError(
				err instanceof Error ? err.message : 'Failed to bulk-add messages'
			)
			console.error(err)
		},
	})

	return (
		<section
			className="space-y-2 rounded border p-3"
			data-testid="admin-messages-bulk-add"
		>
			<button
				type="button"
				className="flex w-full items-center justify-between"
				onClick={() => setOpen((v) => !v)}
			>
				<span className="inline-flex items-center gap-2 text-sm font-semibold">
					<Plus className="h-4 w-4" />
					Bulk add ({prompts.length} parsed)
				</span>
				<ChevronsUpDown className="text-muted-foreground h-4 w-4" />
			</button>
			{open && (
				<div className="space-y-3 pt-2">
					<div className="flex flex-col gap-2 @md:flex-row @md:items-center">
						<p className="text-muted-foreground text-xs">Language</p>
						<div className="max-w-xs grow">
							<SelectOneLanguage value={lang} setValue={setLang} />
						</div>
					</div>
					<div className="flex flex-col gap-2 @md:flex-row @md:items-center">
						<p className="text-muted-foreground text-xs">Tag (optional)</p>
						<Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
							<PopoverTrigger asChild>
								<Button
									size="sm"
									variant="soft"
									data-testid="bulk-add-tag-button"
								>
									{selectedTag ? selectedTag.label : 'No tag'}
									<ChevronsUpDown className="ms-1 h-3 w-3" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-64 p-1">
								<button
									type="button"
									className={cn(
										'hover:bg-1-lo-neutral block w-full rounded p-2 text-start text-sm',
										tagSlug === null && 'bg-1-mlo-primary'
									)}
									onClick={() => {
										setTagSlug(null)
										setTagPickerOpen(false)
									}}
									data-testid="bulk-add-tag-none"
								>
									<span className="text-muted-foreground italic">No tag</span>
								</button>
								<ul className="max-h-64 overflow-y-auto">
									{allTags.map((tag) => (
										<li key={tag.slug}>
											<button
												type="button"
												className={cn(
													'hover:bg-1-lo-neutral block w-full rounded p-2 text-start text-sm',
													tagSlug === tag.slug && 'bg-1-mlo-primary'
												)}
												onClick={() => {
													setTagSlug(tag.slug)
													setTagPickerOpen(false)
												}}
												data-testid="bulk-add-tag-option"
												data-key={tag.slug}
											>
												{tag.label}
											</button>
										</li>
									))}
								</ul>
							</PopoverContent>
						</Popover>
					</div>
					<Textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Paste messages here. Blank lines separate them."
						className="min-h-[180px] font-mono text-sm"
						data-testid="bulk-add-textarea"
					/>
					<div className="flex items-center justify-end gap-2">
						<Button
							size="sm"
							onClick={() => bulkAdd.mutate()}
							disabled={
								bulkAdd.isPending || prompts.length === 0 || !lang || !userId
							}
							data-testid="bulk-add-submit"
						>
							Add {prompts.length} message{prompts.length === 1 ? '' : 's'}
						</Button>
					</div>
				</div>
			)}
		</section>
	)
}

function SelectionBar({
	selected,
	clear,
	allTags,
}: {
	selected: Set<string>
	clear: () => void
	allTags: MessageTagType[]
}) {
	const [tagPickerOpen, setTagPickerOpen] = useState(false)

	const applyTag = (slug: string) => {
		const ids = Array.from(selected)
		Promise.all(
			ids.map(async (message_id) => {
				try {
					const tx = messageTagLinksCollection.insert({
						message_id,
						tag_slug: slug,
						created_at: new Date().toISOString(),
					})
					await tx.isPersisted.promise
				} catch (err) {
					// Duplicate (already tagged) is fine; surface other errors.
					if (
						err instanceof Error &&
						!err.message.toLowerCase().includes('duplicate')
					) {
						throw err
					}
				}
			})
		).then(
			() => {
				toastSuccess(`Applied "${slug}" to ${ids.length}`)
				setTagPickerOpen(false)
			},
			(err: unknown) => {
				toastError('Failed to apply tag to some messages')
				console.error(err)
			}
		)
	}

	const removeTag = (slug: string) => {
		const ids = Array.from(selected)
		Promise.all(
			ids.map(async (message_id) => {
				try {
					const tx = messageTagLinksCollection.delete(`${message_id}--${slug}`)
					await tx.isPersisted.promise
				} catch (err) {
					if (
						err instanceof Error &&
						!err.message.toLowerCase().includes('not found')
					) {
						throw err
					}
				}
			})
		).then(
			() => {
				toastSuccess(`Removed "${slug}" from ${ids.length}`)
				setTagPickerOpen(false)
			},
			(err: unknown) => {
				toastError('Failed to remove tag from some messages')
				console.error(err)
			}
		)
	}

	return (
		<div
			className="bg-1-mlo-primary flex flex-wrap items-center gap-3 rounded border p-3"
			data-testid="admin-messages-selection-bar"
		>
			<span className="text-sm font-semibold">
				{selected.size} message{selected.size === 1 ? '' : 's'} selected
			</span>
			<Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
				<PopoverTrigger asChild>
					<Button size="sm" data-testid="apply-tag-button">
						<Tags className="me-1 h-3 w-3" />
						Apply / remove tag
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 space-y-2">
					<p className="text-muted-foreground text-xs">
						Pick a tag to add to all {selected.size} selected, or remove from
						them.
					</p>
					<ul className="max-h-64 overflow-y-auto">
						{allTags.map((tag) => (
							<li
								key={tag.slug}
								className="flex items-center justify-between gap-2 py-1"
							>
								<span className="text-sm">{tag.label}</span>
								<div className="flex gap-1">
									<Button
										size="sm"
										variant="ghost"
										onClick={() => applyTag(tag.slug)}
										aria-label={`Apply ${tag.label}`}
										data-testid="apply-tag-option"
										data-key={tag.slug}
									>
										<Plus className="h-3 w-3" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => removeTag(tag.slug)}
										aria-label={`Remove ${tag.label}`}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							</li>
						))}
					</ul>
				</PopoverContent>
			</Popover>
			<Button size="sm" variant="ghost" onClick={clear}>
				Clear selection
			</Button>
		</div>
	)
}

function MessagesTable({
	rows,
	selected,
	toggleSelected,
	toggleVisibleAll,
	tagsByMessage,
}: {
	rows: MessageRow[]
	selected: Set<string>
	toggleSelected: (id: string) => void
	toggleVisibleAll: () => void
	tagsByMessage: Map<string, MessageTagType[]>
}) {
	const allVisibleSelected =
		rows.length > 0 && rows.every((r) => selected.has(r.message_id))

	if (rows.length === 0) {
		return (
			<p className="text-muted-foreground py-8 text-center">
				No messages match.
			</p>
		)
	}

	return (
		<div
			className="rounded border"
			data-testid="admin-messages-table"
			data-name="message-row"
		>
			<div className="bg-1-lo-neutral flex items-center gap-2 border-b px-3 py-2 text-xs">
				<Checkbox
					checked={allVisibleSelected}
					onCheckedChange={toggleVisibleAll}
					aria-label="Select all visible"
					data-testid="select-all-visible"
				/>
				<span className="text-muted-foreground font-semibold tracking-wide uppercase">
					Select all visible
				</span>
			</div>
			<ul className="divide-y">
				{rows.map((row) => (
					<MessageRowItem
						key={row.message_id}
						row={row}
						isSelected={selected.has(row.message_id)}
						onToggle={() => toggleSelected(row.message_id)}
						tags={tagsByMessage.get(row.message_id) ?? []}
					/>
				))}
			</ul>
		</div>
	)
}

function MessageRowItem({
	row,
	isSelected,
	onToggle,
	tags,
}: {
	row: MessageRow
	isSelected: boolean
	onToggle: () => void
	tags: MessageTagType[]
}) {
	return (
		<li
			className={cn(
				'flex items-start gap-3 p-3',
				isSelected && 'bg-1-mlo-primary'
			)}
			data-testid="message-row"
			data-key={row.message_id}
		>
			<Checkbox
				checked={isSelected}
				onCheckedChange={onToggle}
				aria-label="Select message"
				className="mt-1"
				data-testid="message-row-checkbox"
			/>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex items-center gap-2">
					<LangBadge lang={row.lang} />
					<span className="text-muted-foreground text-xs">
						{ago(row.created_at)}
					</span>
				</div>
				<p className="text-sm">{row.prompt}</p>
				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{tags.map((tag) => (
							<Badge
								key={tag.slug}
								variant="outline"
								data-testid="row-tag-chip"
								data-key={tag.slug}
							>
								{tag.label}
								<button
									type="button"
									className="hover:text-c-hi ms-1 -me-1 inline-flex items-center"
									onClick={() => detachTag(row.message_id, tag.slug)}
									aria-label={`Remove ${tag.label}`}
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}
			</div>
			<Link
				to="/admin/$lang/requests/$id"
				params={{ lang: row.lang, id: row.request_id }}
				className={buttonVariants({ variant: 'ghost', size: 'sm' })}
				aria-label="Open admin request page"
				data-testid="row-open-request"
			>
				<ExternalLink className="h-3 w-3" />
				Request
			</Link>
		</li>
	)
}

function detachTag(messageId: string, slug: string) {
	const tx = messageTagLinksCollection.delete(`${messageId}--${slug}`)
	tx.isPersisted.promise.catch((err: unknown) => {
		toastError('Failed to remove tag')
		console.error(err)
	})
}
