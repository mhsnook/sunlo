import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	ClipboardCopy,
	Download,
	FileCode,
	ImageIcon,
	TriangleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	PAINTER_MODELS,
	type CrewMessageType,
	type MessageImageType,
	type PaintingType,
	type SvgRefType,
} from '../../../shared/crew'
import { imageQuery, svgQuery } from '~/lib/crew'
import { asPng } from '~/lib/images'
import { CardActions, CardFrame, CrewText } from './crew-parts'

const extensions: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
}

const slug = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')

// The painter's paintings of one brief, one per style. The admin goes with
// one through the card's own actions, and takes any of them away.
export function PaintingsCard({
	message,
	paintings,
}: {
	message: CrewMessageType
	paintings: Array<PaintingType>
}) {
	const picked = message.answer?.actionId
	return (
		<CardFrame
			kind="paintings"
			label="Paintings · go with one"
			brief={[
				message.card?.title,
				message.body,
				...paintings.map(
					(painting) =>
						`${painting.label}: ${painting.style}${painting.error ? ` (failed: ${painting.error})` : ''}`
				),
			]}
		>
			{message.card?.title && (
				<p className="text-sm font-semibold">{message.card.title}</p>
			)}
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			<div className="@container">
				<div className="grid gap-3 @md:grid-cols-2">
					{paintings.map((painting) => (
						<Painting
							key={painting.id}
							painting={painting}
							picked={picked === `painting-${painting.id}`}
						/>
					))}
				</div>
			</div>
			<CardActions message={message} />
		</CardFrame>
	)
}

function Painting({
	painting,
	picked,
}: {
	painting: PaintingType
	picked: boolean
}) {
	const name = `painting-${painting.id}-${painting.label.toLowerCase()}-${slug(painting.style)}`
	const alt = `Painting ${painting.label}, ${painting.style}`
	const caption = <PaintingCaption painting={painting} picked={picked} />
	return (
		<figure
			className={cn(
				'space-y-2 rounded-2xl border p-2',
				picked && 'border-primary-500 bg-primary-50'
			)}
			data-testid="painting"
			data-key={painting.id}
		>
			{painting.svg ? (
				<SvgPicture
					svg={painting.svg}
					alt={alt}
					name={name}
					caption={caption}
				/>
			) : painting.image ? (
				<RasterPicture
					image={painting.image}
					alt={alt}
					name={name}
					caption={caption}
				/>
			) : (
				<>
					<div
						className="bg-danger-50 text-danger-800 flex aspect-4/5 flex-col items-center justify-center gap-2 rounded border p-4 text-center text-sm"
						data-testid="painting-failed"
					>
						<TriangleAlert className="size-5" />
						<p className="font-medium">This style failed</p>
						<p className="text-xs break-words">{painting.error}</p>
					</div>
					{caption}
				</>
			)}
		</figure>
	)
}

function PaintingCaption({
	painting,
	picked,
}: {
	painting: PaintingType
	picked: boolean
}) {
	return (
		<figcaption className="text-sm">
			<span className="font-semibold">{painting.label}</span> {painting.style}
			<span className="text-muted-foreground text-xs">
				{' '}
				· {PAINTER_MODELS[painting.model].label}
			</span>
			{picked && (
				<span className="text-primary-700 ms-1 text-xs font-medium">
					· picked
				</span>
			)}
		</figcaption>
	)
}

// SVGs product-2 drew, to take away.
export function SvgsCard({
	message,
	svgs,
}: {
	message: CrewMessageType
	svgs: Array<SvgRefType>
}) {
	return (
		<CardFrame
			kind="svgs"
			label="SVGs"
			brief={[
				message.card?.title,
				message.body,
				...svgs.map((svg) => svg.title),
			]}
		>
			{message.card?.title && (
				<p className="text-sm font-semibold">{message.card.title}</p>
			)}
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			<div className="@container">
				<div className="grid gap-3 @md:grid-cols-2">
					{svgs.map((svg) => (
						<figure
							key={svg.id}
							className="space-y-2 rounded-2xl border p-2"
							data-testid="svg-tile"
							data-key={svg.id}
						>
							<SvgPicture
								svg={svg}
								alt={svg.title}
								name={`svg-${svg.id}-${slug(svg.title)}`}
								caption={
									<figcaption className="text-sm">{svg.title}</figcaption>
								}
							/>
						</figure>
					))}
				</div>
			</div>
			<CardActions message={message} />
		</CardFrame>
	)
}

// A picture that opens full size in a dialog, with its caption and its
// buttons below it.
function Picture({
	src,
	alt,
	width,
	height,
	isError,
	caption,
	buttons,
}: {
	src: string | undefined
	alt: string
	width: number
	height: number
	isError: boolean
	caption: ReactNode
	buttons: ReactNode
}) {
	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<button
						type="button"
						aria-label={`Open ${alt} full size`}
						data-testid="painting-open"
						className="bg-muted flex w-full items-center justify-center overflow-hidden rounded border"
						style={{ aspectRatio: `${width} / ${height}` }}
					>
						{src ? (
							<img
								src={src}
								alt={alt}
								className="h-full w-full object-contain"
								data-testid="painting-image"
							/>
						) : (
							<ImageIcon
								className={cn(
									'text-muted-foreground size-6',
									!isError && 'animate-pulse'
								)}
							/>
						)}
					</button>
				</DialogTrigger>
				<DialogContent
					className="flex max-h-11/12 max-w-11/12 flex-col p-2"
					data-testid="painting-full"
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
			{caption}
			<div className="flex flex-wrap gap-1">{buttons}</div>
		</>
	)
}

const buttonClass = 'h-7 px-2 shadow-none'

function RasterPicture({
	image,
	alt,
	name,
	caption,
}: {
	image: MessageImageType
	alt: string
	name: string
	caption: ReactNode
}) {
	const { data, isError } = useQuery(imageQuery(image.id))
	const copy = () => {
		if (!data) return
		asPng(data.blob)
			.then((png) =>
				navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
			)
			.then(
				() => toastSuccess(`${alt} copied`),
				(error: Error) => toastError(error.message)
			)
	}
	return (
		<Picture
			src={data?.url}
			alt={alt}
			width={image.width}
			height={image.height}
			isError={isError}
			caption={caption}
			buttons={
				<>
					<Button
						size="sm"
						variant="ghost"
						className={buttonClass}
						disabled={!data}
						onClick={copy}
						data-testid="painting-copy-image"
					>
						<ClipboardCopy /> Copy image
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className={buttonClass}
						asChild
						data-testid="painting-download"
					>
						<a
							href={data?.url}
							download={`${name}.${extensions[data?.blob.type ?? ''] ?? 'png'}`}
						>
							<Download /> Download
						</a>
					</Button>
				</>
			}
		/>
	)
}

function SvgPicture({
	svg,
	alt,
	name,
	caption,
}: {
	svg: SvgRefType
	alt: string
	name: string
	caption: ReactNode
}) {
	const { data, isError } = useQuery(svgQuery(svg.id))
	const copy = () => {
		if (!data) return
		navigator.clipboard.writeText(data.text).then(
			() => toastSuccess(`${alt}: SVG copied`),
			(error: Error) => toastError(error.message)
		)
	}
	return (
		<Picture
			src={data?.src}
			alt={alt}
			width={svg.width}
			height={svg.height}
			isError={isError}
			caption={caption}
			buttons={
				<>
					<Button
						size="sm"
						variant="ghost"
						className={buttonClass}
						disabled={!data}
						onClick={copy}
						data-testid="svg-copy"
					>
						<FileCode /> Copy SVG
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className={buttonClass}
						asChild
						data-testid="svg-download"
					>
						<a href={data?.downloadUrl} download={`${name}.svg`}>
							<Download /> Download
						</a>
					</Button>
				</>
			}
		/>
	)
}
