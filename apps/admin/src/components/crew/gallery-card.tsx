import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCopy, Download, ImageIcon, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import type {
	CardType,
	CrewMessageType,
	SketchType,
} from '../../../shared/crew'
import { sketchImageQuery } from '~/lib/crew'
import { asPng } from '~/lib/images'
import { CardActions, CardFrame, CrewText } from './crew-parts'

// A card of pictures: sketches, paintings or SVGs. The tiles are its
// children, side by side in a grid unless `grid` is false.
export function GalleryCard({
	message,
	kind,
	label,
	brief,
	wide = false,
	grid = true,
	above,
	primary,
	children,
}: {
	message: CrewMessageType
	kind: CardType['kind']
	label: string
	brief: Array<string | null | undefined>
	// Three columns on a wide card, not two.
	wide?: boolean
	grid?: boolean
	// A line above the title.
	above?: ReactNode
	// Buttons in place of the card's own actions.
	primary?: ReactNode
	children: ReactNode
}) {
	return (
		<CardFrame kind={kind} label={label} brief={brief}>
			{above}
			{message.card?.title && (
				<p className="text-sm font-semibold">{message.card.title}</p>
			)}
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			{grid ? (
				<div className="@container">
					<div
						className={cn(
							'grid gap-3 @md:grid-cols-2',
							wide && '@2xl:grid-cols-3'
						)}
					>
						{children}
					</div>
				</div>
			) : (
				children
			)}
			<CardActions message={message} primary={primary} />
		</CardFrame>
	)
}

export function GalleryTile({
	picked = false,
	testId,
	dataKey,
	children,
}: {
	picked?: boolean
	testId: string
	dataKey: number
	children: ReactNode
}) {
	return (
		<figure
			className={cn(
				'space-y-2 rounded-2xl border p-2',
				picked && 'border-primary-500 bg-primary-50'
			)}
			data-testid={testId}
			data-key={dataKey}
		>
			{children}
		</figure>
	)
}

export function TileCaption({
	picked = false,
	children,
}: {
	picked?: boolean
	children: ReactNode
}) {
	return (
		<figcaption className="text-sm">
			{children}
			{picked && (
				<span className="text-primary-700 ms-1 text-xs font-medium">
					· picked
				</span>
			)}
		</figcaption>
	)
}

export const tileButtonClass = 'h-7 px-2 shadow-none'

// A sketch's picture in the shape of its frame. The picture itself takes no
// clicks, since what matters can sit in its corners; a View button shows
// over it on hover or keyboard focus.
export function SketchFrame({
	frame,
	viewLabel,
	onView,
	testId,
	children,
}: {
	frame: SketchType['frame']
	viewLabel: string
	onView: () => void
	testId: string
	children: ReactNode
}) {
	return (
		<div
			className={cn(
				'group bg-muted relative flex items-center justify-center overflow-hidden rounded border',
				frame === 'phone' ? 'aspect-390/844' : 'aspect-8/5'
			)}
		>
			{children}
			<Button
				size="sm"
				variant="soft"
				className="absolute inset-x-2 bottom-2 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
				onClick={onView}
				aria-label={viewLabel}
				data-testid={testId}
			>
				<Maximize2 /> View
			</Button>
		</div>
	)
}

// Pulses while a picture loads, and stops if loading failed.
export function PicturePlaceholder({ failed }: { failed: boolean }) {
	return (
		<ImageIcon
			className={cn('text-muted-foreground size-6', !failed && 'animate-pulse')}
		/>
	)
}

// A sketch's picture, cropped to the top of its frame.
export function SketchPicture({
	sketchId,
	alt,
	dim = false,
	testId,
}: {
	sketchId: number
	alt: string
	dim?: boolean
	testId?: string
}) {
	const { data: image, isError } = useQuery(sketchImageQuery(sketchId))
	return image ? (
		<img
			src={image.url}
			alt={alt}
			className={cn(
				'h-full w-full object-cover object-top',
				dim && 'opacity-40'
			)}
			data-testid={testId}
		/>
	) : (
		<PicturePlaceholder failed={isError} />
	)
}

const extensions: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/svg+xml': 'svg',
}

const slug = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')

// A download's name, such as painting-12-b-luxury.jpg.
export const fileName = (
	kind: string,
	id: number,
	words: Array<string>,
	type: string
) =>
	`${[kind, String(id), ...words.map(slug)].join('-')}.${extensions[type] ?? 'png'}`

// Copy image and Download for a picture the app holds as a blob.
export function PictureButtons({
	picture,
	label,
	name,
}: {
	picture: { blob: Blob; url: string } | undefined
	label: string
	name: string
}) {
	const copy = () => {
		if (!picture) return
		asPng(picture.blob)
			.then((png) =>
				navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
			)
			.then(
				() => toastSuccess(`${label} copied`),
				(error: Error) => toastError(error.message)
			)
	}
	return (
		<>
			<Button
				size="sm"
				variant="ghost"
				className={tileButtonClass}
				disabled={!picture}
				onClick={copy}
				data-testid="picture-copy-image"
			>
				<ClipboardCopy /> Copy image
			</Button>
			<Button
				size="sm"
				variant="ghost"
				className={tileButtonClass}
				asChild
				data-testid="picture-download"
			>
				<a href={picture?.url} download={name}>
					<Download /> Download
				</a>
			</Button>
		</>
	)
}
