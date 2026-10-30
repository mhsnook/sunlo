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

// The images in a compose bar: pasted, dropped or picked, then scaled down
// in the browser. They upload when the message is sent.
export function useDraftImages() {
	const [images, setImages] = useState<Array<DraftImage>>([])
	const [adding, setAdding] = useState(0)

	// False when none of the files is an image, so a paste of text goes on.
	const add = (files: Iterable<File>) => {
		const picked = [...files].filter((file) => file.type.startsWith('image/'))
		if (!picked.length) return false
		const room = MAX_IMAGES_PER_MESSAGE - images.length - adding
		if (picked.length > room) {
			toastError(`A message holds at most ${MAX_IMAGES_PER_MESSAGE} images`)
		}
		for (const file of picked.slice(0, Math.max(0, room))) {
			setAdding((count) => count + 1)
			shrinkImage(file)
				.then((shrunk) =>
					setImages((current) => [
						...current,
						{
							key: crypto.randomUUID(),
							url: URL.createObjectURL(shrunk.blob),
							...shrunk,
						},
					])
				)
				.catch((error: Error) => toastError(error.message))
				.finally(() => setAdding((count) => count - 1))
		}
		return true
	}

	const remove = (key: string) => {
		const gone = images.find((image) => image.key === key)
		if (gone) URL.revokeObjectURL(gone.url)
		setImages((current) => current.filter((image) => image.key !== key))
	}

	// A strip URL lives only as long as its thumbnail: the timeline makes
	// its own URLs for the same blobs, and `restore` makes new ones.
	const take = () => {
		const taken = images
		for (const image of taken) URL.revokeObjectURL(image.url)
		setImages([])
		return taken
	}

	const restore = (taken: Array<DraftImage>) =>
		setImages((current) =>
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

	return { images, adding, add, remove, take, restore, formProps }
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
	images,
	adding,
	onRemove,
}: {
	images: Array<DraftImage>
	adding: number
	onRemove: (key: string) => void
}) {
	if (!images.length && !adding) return null
	return (
		<div
			className="flex flex-wrap gap-2 px-3 pt-3"
			data-testid="compose-images"
		>
			{images.map((image, index) => (
				<div
					key={image.key}
					className="relative"
					data-testid="compose-image"
					data-key={image.key}
				>
					<img
						src={image.url}
						alt={`Attachment ${index + 1}, ${image.width}×${image.height}`}
						className="size-16 rounded-xl border object-cover"
					/>
					<Button
						type="button"
						variant="neutral"
						size="icon"
						aria-label={`Remove image ${index + 1}`}
						data-testid="compose-image-remove"
						className="bg-card absolute -end-2 -top-2 size-6 rounded-full border"
						onClick={() => onRemove(image.key)}
					>
						<X />
					</Button>
				</div>
			))}
			{Array.from({ length: adding }, (_, index) => (
				<div
					key={`adding-${index}`}
					className="bg-muted flex size-16 items-center justify-center rounded-xl border"
				>
					<Loader2 className="text-muted-foreground size-4 animate-spin" />
				</div>
			))}
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
	const label = `Image ${image.id}, ${image.width}×${image.height}`
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="neutral"
					aria-label={`Open ${label.toLowerCase()} full size`}
					data-testid="crew-message-image"
					data-key={image.id}
					className="bg-muted border-border h-32 max-w-full overflow-hidden p-0 shadow-none"
					style={{ aspectRatio: `${image.width} / ${image.height}` }}
				>
					{data ? (
						<img
							src={data.url}
							alt={label}
							className="h-full w-full object-cover"
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
				<DialogTitle className="sr-only">{label}</DialogTitle>
				{data && (
					<img
						src={data.url}
						alt={label}
						className="min-h-0 self-center object-contain"
					/>
				)}
			</DialogContent>
		</Dialog>
	)
}
