import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileCode, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	PAINTER_MODELS,
	type CrewMessageType,
	type MessageImageType,
	type PaintingType,
	type SvgRefType,
} from '../../../shared/crew'
import { downloadSvg, imageQuery, svgQuery } from '~/lib/crew'
import {
	fileName,
	GalleryCard,
	GalleryTile,
	PictureButtons,
	TileCaption,
	tileButtonClass,
} from './gallery-card'
import { ImageViewer } from './images'

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
		<GalleryCard
			message={message}
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
			{paintings.map((painting) => (
				<Painting
					key={painting.id}
					painting={painting}
					picked={picked === `painting-${painting.id}`}
				/>
			))}
		</GalleryCard>
	)
}

function Painting({
	painting,
	picked,
}: {
	painting: PaintingType
	picked: boolean
}) {
	const words = [painting.label, painting.style]
	const alt = `Painting ${painting.label}, ${painting.style}`
	const caption = (
		<TileCaption picked={picked}>
			<span className="font-semibold">{painting.label}</span> {painting.style}
			<span className="text-muted-foreground text-xs">
				{' '}
				· {PAINTER_MODELS[painting.model].label}
			</span>
		</TileCaption>
	)
	return (
		<GalleryTile picked={picked} testId="painting" dataKey={painting.id}>
			{painting.svg ? (
				<SvgPicture
					svg={painting.svg}
					alt={alt}
					name={fileName('painting', painting.id, words, 'image/svg+xml')}
					caption={caption}
				/>
			) : painting.image ? (
				<RasterPicture
					image={painting.image}
					alt={alt}
					paintingId={painting.id}
					words={words}
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
		</GalleryTile>
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
		<GalleryCard
			message={message}
			kind="svgs"
			label="SVGs"
			brief={[
				message.card?.title,
				message.body,
				...svgs.map((svg) => svg.title),
			]}
		>
			{svgs.map((svg) => (
				<GalleryTile key={svg.id} testId="svg-tile" dataKey={svg.id}>
					<SvgPicture
						svg={svg}
						alt={svg.title}
						name={fileName('svg', svg.id, [svg.title], 'image/svg+xml')}
						caption={<TileCaption>{svg.title}</TileCaption>}
					/>
				</GalleryTile>
			))}
		</GalleryCard>
	)
}

const viewerClass = 'h-auto w-full rounded'

function RasterPicture({
	image,
	alt,
	paintingId,
	words,
	caption,
}: {
	image: MessageImageType
	alt: string
	paintingId: number
	words: Array<string>
	caption: ReactNode
}) {
	const { data, isError } = useQuery(imageQuery(image.id))
	return (
		<>
			<ImageViewer
				src={data?.url}
				alt={alt}
				width={image.width}
				height={image.height}
				isError={isError}
				fit="contain"
				className={viewerClass}
				testId="painting-open"
				imageTestId="painting-image"
			/>
			{caption}
			<div className="flex flex-wrap gap-1">
				<PictureButtons
					picture={data}
					label={alt}
					name={fileName('painting', paintingId, words, data?.blob.type ?? '')}
				/>
			</div>
		</>
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
		<>
			<ImageViewer
				src={data?.src}
				alt={alt}
				width={svg.width}
				height={svg.height}
				isError={isError}
				fit="contain"
				className={viewerClass}
				testId="painting-open"
				imageTestId="painting-image"
			/>
			{caption}
			<div className="flex flex-wrap gap-1">
				<Button
					size="sm"
					variant="ghost"
					className={tileButtonClass}
					disabled={!data}
					onClick={copy}
					data-testid="svg-copy"
				>
					<FileCode /> Copy SVG
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className={tileButtonClass}
					disabled={!data}
					onClick={() => data && downloadSvg(data.text, name)}
					data-testid="svg-download"
				>
					<Download /> Download
				</Button>
			</div>
		</>
	)
}
