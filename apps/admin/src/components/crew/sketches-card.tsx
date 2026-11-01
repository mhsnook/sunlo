import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	stepLabel,
	type CrewMessageType,
	type SketchType,
} from '../../../shared/crew'
import { sketchImageQuery, sketchQuery } from '~/lib/crew'
import {
	fileName,
	GalleryCard,
	GalleryTile,
	PictureButtons,
	SketchPicture,
	sketchFrameClass,
	TileCaption,
	tileButtonClass,
} from './gallery-card'
import { OriginLine } from './flow-card'

// product-2's mockups as options, side by side. The admin goes with one
// through the card's own actions, and takes any of them away as a picture
// or as HTML. A flow's screens are a FlowCard instead.
export function SketchesCard({
	message,
	sketches,
}: {
	message: CrewMessageType
	sketches: Array<SketchType>
}) {
	const picked = message.answer?.actionId
	const origin = message.card?.from
	return (
		<GalleryCard
			message={message}
			kind="sketches"
			label={
				message.card?.actions.length
					? 'Sketches · go with one'
					: origin
						? `Step ${stepLabel(origin.step)}, drawn again`
						: 'Sketches'
			}
			above={origin && <OriginLine origin={origin} />}
			brief={[
				message.card?.title,
				message.body,
				...sketches.map((sketch) => `${sketch.label}: ${sketch.idea}`),
			]}
			wide
		>
			{sketches.map((sketch) => (
				<Sketch
					key={sketch.id}
					sketch={sketch}
					picked={picked === `sketch-${sketch.id}`}
				/>
			))}
		</GalleryCard>
	)
}

function Sketch({ sketch, picked }: { sketch: SketchType; picked: boolean }) {
	const queryClient = useQueryClient()
	const { data: image } = useQuery(sketchImageQuery(sketch.id))

	const copyBrief = () => {
		queryClient
			.fetchQuery(sketchQuery(sketch.id))
			.then((source) =>
				navigator.clipboard.writeText(
					`Mockup ${source.label} (${source.frame}): ${source.idea}\n\n\`\`\`html\n${source.html}\n\`\`\``
				)
			)
			.then(
				() => toastSuccess(`Sketch ${sketch.label}'s brief copied`),
				(error: Error) => toastError(error.message)
			)
	}

	return (
		<GalleryTile picked={picked} testId="sketch" dataKey={sketch.id}>
			<a
				href={image?.url}
				target="_blank"
				rel="noreferrer"
				className={sketchFrameClass(sketch.frame)}
				aria-label={`Open sketch ${sketch.label} full size`}
			>
				<SketchPicture
					sketchId={sketch.id}
					alt={`Sketch ${sketch.label}: ${sketch.idea}`}
					testId="sketch-image"
				/>
			</a>
			<TileCaption picked={picked}>
				<span className="font-semibold">{sketch.label}</span> {sketch.idea}
			</TileCaption>
			<div className="flex flex-wrap gap-1">
				<PictureButtons
					picture={image}
					label={`Sketch ${sketch.label}`}
					name={fileName(
						'sketch',
						sketch.id,
						[sketch.label],
						image?.blob.type ?? ''
					)}
				/>
				<Button
					size="sm"
					variant="ghost"
					className={tileButtonClass}
					onClick={copyBrief}
					data-testid="sketch-copy-brief"
				>
					<FileCode /> Copy brief
				</Button>
			</div>
		</GalleryTile>
	)
}
