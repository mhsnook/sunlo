import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ImageIcon, ImagePlus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { toastError } from '@/components/ui/sonner'
import {
	MAX_IMAGES_PER_MESSAGE,
	type MessageImageType,
} from '../../../shared/crew'
import { imageQuery, type DraftImage } from '~/lib/crew'
import { shrinkImage } from '~/lib/images'

// A draft image that is still being scaled down holds its place in the
// strip, so the images keep the order the admin added them in.
export type DraftSlot = DraftImage | { key: string; pending: true }

const isReady = (slot: DraftSlot): slot is DraftImage => !('pending' in slot)

// The images in a compose bar: pasted, dropped or picked, then scaled down
// in the browser. They upload when the message is sent.
export function useDraftImages() {
	const [slots, setSlots] = useState<Array<DraftSlot>>([])
	// The keys of pending slots that are still in the strip. A scale that
	// finishes after its slot was removed must not make an object URL.
	const pending = useRef(new Set<string>())
	const images = slots.filter(isReady)
	const adding = slots.length - images.length

	// False when none of the files is an image, so a paste of text goes on.
	const add = (files: Iterable<File>) => {
		const picked = [...files].filter((file) => file.type.startsWith('image/'))
		if (!picked.length) return false
		const room = MAX_IMAGES_PER_MESSAGE - slots.length
		if (picked.length > room) {
			toastError(`A message holds at most ${MAX_IMAGES_PER_MESSAGE} images`)
		}
		const reserved = picked
			.slice(0, Math.max(0, room))
			.map((file) => ({ file, key: crypto.randomUUID() }))
		for (const { key } of reserved) pending.current.add(key)
		setSlots((current) => [
			...current,
			...reserved.map(({ key }) => ({ key, pending: true as const })),
		])
		for (const { file, key } of reserved) {
			shrinkImage(file)
				.then((shrunk) => {
					if (!pending.current.delete(key)) return
					const image = {
						key,
						url: URL.createObjectURL(shrunk.blob),
						...shrunk,
					}
					setSlots((current) =>
						current.map((slot) => (slot.key === key ? image : slot))
					)
				})
				.catch((error: Error) => {
					pending.current.delete(key)
					setSlots((current) => current.filter((slot) => slot.key !== key))
					toastError(error.message)
				})
		}
		return true
	}

	const remove = (key: string) => {
		pending.current.delete(key)
		const gone = slots.find((slot) => slot.key === key)
		if (gone && isReady(gone)) URL.revokeObjectURL(gone.url)
		setSlots((current) => current.filter((slot) => slot.key !== key))
	}

	// Takes the finished images and leaves pending ones in the strip.
	// A strip URL lives only as long as its thumbnail: the timeline makes
	// its own URLs for the same blobs, and `restore` makes new ones.
	const take = () => {
		const taken = images
		for (const image of taken) URL.revokeObjectURL(image.url)
		setSlots((current) => current.filter((slot) => !isReady(slot)))
		return taken
	}

	const restore = (taken: Array<DraftImage>) =>
		setSlots((current) =>
			current.length
				? current
				: taken.map((image) => ({
						...image,
						url: URL.createObjectURL(image.blob),
					}))
		)

	// For the compose bar's form: a paste or a drop that holds images adds
	// them instead of their file names. Copied spreadsheet cells come with a
	// picture of themselves, so a paste that holds text pastes the text only.
	const formProps = {
		onPaste: (event: ClipboardEvent<HTMLFormElement>) => {
			if (event.clipboardData.getData('text/plain')) return
			if (add(event.clipboardData.files)) event.preventDefault()
		},
		onDragOver: (event: DragEvent<HTMLFormElement>) => {
			if (event.dataTransfer.types.includes('Files')) event.preventDefault()
		},
		onDrop: (event: DragEvent<HTMLFormElement>) => {
			if (add(event.dataTransfer.files)) event.preventDefault()
		},
	}

	return { slots, images, adding, add, remove, take, restore, formProps }
}

export function AttachImageButton({
	onFiles,
}: {
	onFiles: (files: FileList) => void
}) {
	const input = useRef<HTMLInputElement>(null)
	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Add an image"
				data-testid="compose-add-image"
				onClick={() => input.current?.click()}
			>
				<ImagePlus />
			</Button>
			<input
				ref={input}
				type="file"
				accept="image/*"
				multiple
				hidden
				aria-label="Add an image"
				data-testid="compose-image-input"
				onChange={(event) => {
					if (event.target.files) onFiles(event.target.files)
					event.target.value = ''
				}}
			/>
		</>
	)
}

export function DraftImageStrip({
	slots,
	onRemove,
}: {
	slots: Array<DraftSlot>
	onRemove: (key: string) => void
}) {
	if (!slots.length) return null
	return (
		<div
			className="flex flex-wrap gap-2 px-3 pt-3"
			data-testid="compose-images"
		>
			{slots.map((slot, index) => {
				const shown = isReady(slot)
					? {
							src: slot.url,
							alt: `Attachment ${index + 1}, ${slot.width}×${slot.height}`,
							testId: 'compose-image',
						}
					: {
							src: undefined,
							alt: `Attachment ${index + 1}, scaling down`,
							testId: 'compose-image-pending',
							pending: true,
						}
				return (
					<RemovableThumbnail
						key={slot.key}
						{...shown}
						removeLabel={`Remove image ${index + 1}`}
						onRemove={() => onRemove(slot.key)}
						removeTestId="compose-image-remove"
						dataKey={slot.key}
					/>
				)
			})}
		</div>
	)
}

// A small picture with a Remove button on its corner. An empty box stands
// in while `src` loads, with a spinner while the picture is `pending`.
export function RemovableThumbnail({
	src,
	pending = false,
	alt,
	removeLabel,
	onRemove,
	testId,
	removeTestId,
	dataKey,
}: {
	src: string | undefined
	pending?: boolean
	alt: string
	removeLabel: string
	onRemove: () => void
	testId: string
	removeTestId: string
	dataKey: string | number
}) {
	return (
		<div className="relative" data-testid={testId} data-key={dataKey}>
			{src ? (
				<img
					src={src}
					alt={alt}
					className="size-16 rounded-xl border object-cover"
				/>
			) : (
				<div className="bg-muted flex size-16 items-center justify-center rounded-xl border">
					{pending && (
						<Loader2
							aria-label={alt}
							className="text-muted-foreground size-4 animate-spin"
						/>
					)}
				</div>
			)}
			<Button
				type="button"
				variant="neutral"
				size="icon"
				aria-label={removeLabel}
				data-testid={removeTestId}
				className="bg-card absolute -end-2 -top-2 size-6 rounded-full border"
				onClick={onRemove}
			>
				<X />
			</Button>
		</div>
	)
}

// A sent message's images as thumbnails; a click opens one full size.
export function MessageImages({
	images,
	align,
}: {
	images: Array<MessageImageType>
	align: 'start' | 'end'
}) {
	return (
		<div
			className={cn(
				'flex max-w-full flex-wrap gap-2',
				align === 'end' && 'justify-end'
			)}
			data-testid="crew-message-images"
		>
			{images.map((image) => (
				<MessageImage key={image.id} image={image} />
			))}
		</div>
	)
}

function MessageImage({ image }: { image: MessageImageType }) {
	const { data, isError } = useQuery(imageQuery(image.id))
	return (
		<ImageViewer
			src={data?.url}
			alt={`Image ${image.id}, ${image.width}×${image.height}`}
			width={image.width}
			height={image.height}
			isError={isError}
			fit="cover"
			className="h-32 max-w-full"
			testId="crew-message-image"
			dataKey={image.id}
		/>
	)
}

// A thumbnail in the picture's own shape that opens it full size in a
// dialog. It pulses until `src` loads, and stops if loading failed.
export function ImageViewer({
	src,
	alt,
	width,
	height,
	isError,
	fit,
	className,
	testId,
	imageTestId,
	dataKey,
}: {
	src: string | undefined
	alt: string
	width: number
	height: number
	isError: boolean
	fit: 'cover' | 'contain'
	className?: string
	testId: string
	imageTestId?: string
	dataKey?: string | number
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="neutral"
					aria-label={`Open ${alt.charAt(0).toLowerCase()}${alt.slice(1)} full size`}
					data-testid={testId}
					data-key={dataKey}
					className={cn(
						'bg-muted border-border overflow-hidden p-0 shadow-none',
						className
					)}
					style={{ aspectRatio: `${width} / ${height}` }}
				>
					{src ? (
						<img
							src={src}
							alt={alt}
							className={cn(
								'h-full w-full',
								fit === 'cover' ? 'object-cover' : 'object-contain'
							)}
							data-testid={imageTestId}
						/>
					) : (
						<ImageIcon
							className={cn(
								'text-muted-foreground size-6',
								!isError && 'animate-pulse'
							)}
						/>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent
				className="flex max-h-11/12 max-w-11/12 flex-col p-2"
				data-testid="crew-image-full"
			>
				<DialogTitle className="sr-only">{alt}</DialogTitle>
				{src && (
					<img
						src={src}
						alt={alt}
						className="min-h-0 self-center object-contain"
					/>
				)}
			</DialogContent>
		</Dialog>
	)
}
