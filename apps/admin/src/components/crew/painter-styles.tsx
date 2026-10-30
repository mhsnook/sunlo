import { useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
	ChevronDown,
	ChevronRight,
	Pencil,
	Plus,
	Trash2,
	X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	displayName,
	MAX_STYLE_EXAMPLES,
	PAINTER_MODELS,
	painterModelIds,
	type MessageImageType,
	type PainterModel,
	type PainterStyleType,
} from '../../../shared/crew'
import {
	imageQuery,
	painterStylesQuery,
	useDeletePainterStyle,
	useSavePainterStyle,
} from '~/lib/crew'
import {
	AttachImageButton,
	DraftImageStrip,
	MessageImages,
	useDraftImages,
} from './images'
import { Empty, Section } from './workspace-parts'

const fail = (error: Error) => toastError(error.message)

const modelItems = painterModelIds.map((id) => ({
	value: id,
	label: PAINTER_MODELS[id].label,
}))

// The styles product-2's painter paints in, which the admin adds, edits
// and deletes here. product-2 reads the list with painter_styles.
export function PainterStyles() {
	const { data: styles } = useSuspenseQuery(painterStylesQuery())
	// A style's id while the admin edits it, or "new" while they add one.
	const [editing, setEditing] = useState<number | 'new' | null>(null)
	return (
		<Section title={`Painter styles · ${styles.length}`}>
			<div className="space-y-3" data-testid="painter-styles">
				<p className="text-muted-foreground text-sm">
					{displayName('product-2')} has ideas painted in these styles, each
					pushed to its extreme, then redraws what works within the brand.
				</p>
				{styles.length ? (
					<ul className="bg-card divide-y rounded border">
						{styles.map((style) =>
							editing === style.id ? (
								<li key={style.id} className="p-3">
									<StyleForm style={style} onDone={() => setEditing(null)} />
								</li>
							) : (
								<StyleEntry
									key={style.id}
									style={style}
									onEdit={() => setEditing(style.id)}
								/>
							)
						)}
					</ul>
				) : (
					<Empty>No styles yet.</Empty>
				)}
				{editing === 'new' ? (
					<div className="bg-card rounded border p-3">
						<StyleForm style={null} onDone={() => setEditing(null)} />
					</div>
				) : (
					<Button
						size="sm"
						variant="soft"
						onClick={() => setEditing('new')}
						data-testid="painter-style-add"
					>
						<Plus /> Add a style
					</Button>
				)}
			</div>
		</Section>
	)
}

function StyleEntry({
	style,
	onEdit,
}: {
	style: PainterStyleType
	onEdit: () => void
}) {
	const [open, setOpen] = useState(false)
	const remove = useDeletePainterStyle()
	return (
		<li
			className="space-y-2 px-3 py-2.5 text-sm"
			data-testid="painter-style"
			data-key={style.name}
		>
			<div className="flex items-start gap-1">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-start gap-2 text-start"
					aria-expanded={open}
					onClick={() => setOpen((value) => !value)}
					data-testid="painter-style-toggle"
				>
					{open ? (
						<ChevronDown className="mt-0.5 size-4 shrink-0" />
					) : (
						<ChevronRight className="mt-0.5 size-4 shrink-0" />
					)}
					<span className="min-w-0">
						<span className="font-semibold">{style.name}</span>
						<span className="text-muted-foreground text-xs">
							{' '}
							· {PAINTER_MODELS[style.model].label}
						</span>
						<span className="text-muted-foreground block">
							{style.description}
						</span>
					</span>
				</button>
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Edit the ${style.name} style`}
					onClick={onEdit}
					data-testid="painter-style-edit"
				>
					<Pencil />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Delete the ${style.name} style`}
					disabled={remove.isPending}
					onClick={() =>
						remove.mutate(style.id, {
							onSuccess: () => toastSuccess(`${style.name} deleted`),
							onError: fail,
						})
					}
					data-testid="painter-style-delete"
				>
					<Trash2 />
				</Button>
			</div>
			{open && (
				<div className="space-y-2 ps-6">
					<p
						className="bg-muted rounded p-2 text-xs whitespace-pre-wrap"
						data-testid="painter-style-prompt"
					>
						{style.prompt}
					</p>
					<p className="text-muted-foreground text-xs">
						{PAINTER_MODELS[style.model].cost}
						{PAINTER_MODELS[style.model].references
							? `; takes up to ${PAINTER_MODELS[style.model].references} reference images`
							: '; takes no reference images'}
					</p>
					{style.examples.length > 0 && (
						<MessageImages images={style.examples} align="start" />
					)}
				</div>
			)}
		</li>
	)
}

function StyleForm({
	style,
	onDone,
}: {
	style: PainterStyleType | null
	onDone: () => void
}) {
	const save = useSavePainterStyle()
	const [name, setName] = useState(style?.name ?? '')
	const [description, setDescription] = useState(style?.description ?? '')
	const [prompt, setPrompt] = useState(style?.prompt ?? '')
	const [model, setModel] = useState<PainterModel>(
		style?.model ?? 'black-forest-labs/flux-3-image-klein'
	)
	const [examples, setExamples] = useState<Array<MessageImageType>>(
		style?.examples ?? []
	)
	const drafts = useDraftImages()
	const room = MAX_STYLE_EXAMPLES - examples.length - drafts.images.length
	const ready = !!name.trim() && !!description.trim() && !!prompt.trim()

	const submit = () => {
		if (!ready) return
		if (room < 0) {
			toastError(`A style has at most ${MAX_STYLE_EXAMPLES} examples`)
			return
		}
		save.mutate(
			{
				id: style?.id ?? null,
				style: {
					name: name.trim(),
					description: description.trim(),
					prompt: prompt.trim(),
					model,
				},
				examples: examples.map((image) => image.id),
				newExamples: drafts.images,
			},
			{
				onSuccess: () => {
					toastSuccess(`${name.trim()} saved`)
					onDone()
				},
				onError: fail,
			}
		)
	}

	return (
		<form
			className="space-y-2"
			data-testid="painter-style-form"
			{...drafts.formProps}
			onSubmit={(event) => {
				event.preventDefault()
				submit()
			}}
		>
			<Input
				value={name}
				onChange={(event) => setName(event.target.value)}
				placeholder="Name, such as Risograph"
				aria-label="Name"
				maxLength={60}
				data-testid="painter-style-name"
			/>
			<Input
				value={description}
				onChange={(event) => setDescription(event.target.value)}
				placeholder="What it looks like, in one line"
				aria-label="Description"
				maxLength={200}
				data-testid="painter-style-description"
			/>
			<Textarea
				value={prompt}
				onChange={(event) => setPrompt(event.target.value)}
				placeholder="The prompt that sets the style. Push it to the extreme."
				aria-label="Prompt"
				rows={5}
				maxLength={2000}
				data-testid="painter-style-prompt-input"
			/>
			<Select
				items={modelItems}
				value={model}
				onValueChange={(value) => {
					if (value) setModel(value)
				}}
			>
				<SelectTrigger
					className="bg-card border"
					aria-label="Model"
					data-testid="painter-style-model"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{modelItems.map((item) => (
						<SelectItem
							key={item.value}
							value={item.value}
							data-testid="painter-style-model-option"
							data-key={item.value}
						>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p className="text-muted-foreground text-xs">
				{PAINTER_MODELS[model].cost}.
			</p>
			<div className="space-y-1">
				<p className="text-muted-foreground text-xs">
					Examples: paste or add up to {MAX_STYLE_EXAMPLES} images.
				</p>
				<div className="flex flex-wrap items-center gap-2">
					{examples.map((image, index) => (
						<KeptExample
							key={image.id}
							image={image}
							index={index}
							onRemove={() =>
								setExamples((current) =>
									current.filter((kept) => kept.id !== image.id)
								)
							}
						/>
					))}
					<AttachImageButton onFiles={(files) => drafts.add(files)} />
				</div>
				<div className="-mx-3">
					<DraftImageStrip
						images={drafts.images}
						adding={drafts.adding}
						onRemove={drafts.remove}
					/>
				</div>
			</div>
			<div className="flex gap-1">
				<Button
					type="submit"
					size="sm"
					disabled={!ready || save.isPending || drafts.adding > 0}
					data-testid="painter-style-save"
				>
					Save
				</Button>
				<Button type="button" size="sm" variant="ghost" onClick={onDone}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

function KeptExample({
	image,
	index,
	onRemove,
}: {
	image: MessageImageType
	index: number
	onRemove: () => void
}) {
	const { data } = useQuery(imageQuery(image.id))
	return (
		<div
			className="relative"
			data-testid="painter-style-example"
			data-key={image.id}
		>
			{data ? (
				<img
					src={data.url}
					alt={`Example ${index + 1}`}
					className="size-16 rounded-xl border object-cover"
				/>
			) : (
				<div className="bg-muted size-16 rounded-xl border" />
			)}
			<Button
				type="button"
				variant="neutral"
				size="icon"
				aria-label={`Remove example ${index + 1}`}
				className="bg-card absolute -end-2 -top-2 size-6 rounded-full border"
				onClick={onRemove}
				data-testid="painter-style-example-remove"
			>
				<X />
			</Button>
		</div>
	)
}
