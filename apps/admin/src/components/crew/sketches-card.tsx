import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCopy, Download, FileCode, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import type { CrewMessageType, SketchType } from '../../../shared/crew'
import { sketchImageQuery, sketchQuery } from '~/lib/crew'
import { CardActions, CardFrame, CrewText } from './crew-parts'

// product-2's mockups, side by side. The admin goes with one through the
// card's own actions, and takes any of them away as a picture or as HTML.
export function SketchesCard({
	message,
	sketches,
}: {
	message: CrewMessageType
	sketches: Array<SketchType>
}) {
	const picked = message.answer?.actionId
	return (
		<CardFrame
			kind="sketches"
			label="Sketches · go with one"
			brief={[
				message.card?.title,
				message.body,
				...sketches.map((sketch) => `${sketch.label}: ${sketch.idea}`),
			]}
		>
			{message.card?.title && (
				<p className="text-sm font-semibold">{message.card.title}</p>
			)}
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			<div className="@container">
				<div className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
					{sketches.map((sketch) => (
						<Sketch
							key={sketch.id}
							sketch={sketch}
							picked={picked === `sketch-${sketch.id}`}
						/>
					))}
				</div>
			</div>
			<CardActions message={message} />
		</CardFrame>
	)
}

function Sketch({ sketch, picked }: { sketch: SketchType; picked: boolean }) {
	const queryClient = useQueryClient()
	const { data: image, isError } = useQuery(sketchImageQuery(sketch.id))
	const name = `sketch-${sketch.id}-${sketch.label.toLowerCase()}.${image?.blob.type === 'image/jpeg' ? 'jpg' : 'png'}`

	const copyImage = () => {
		if (!image) return
		navigator.clipboard
			.write([new ClipboardItem({ [image.blob.type]: image.blob })])
			.then(
				() => toastSuccess(`Sketch ${sketch.label} copied`),
				(error: Error) => toastError(error.message)
			)
	}
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
		<figure
			className={cn(
				'space-y-2 rounded-2xl border p-2',
				picked && 'border-primary-500 bg-primary-50'
			)}
			data-testid="sketch"
			data-key={sketch.id}
		>
			<a
				href={image?.url}
				target="_blank"
				rel="noreferrer"
				className={cn(
					'bg-muted flex items-center justify-center overflow-hidden rounded border',
					sketch.frame === 'phone' ? 'aspect-390/844' : 'aspect-8/5'
				)}
				aria-label={`Open sketch ${sketch.label} full size`}
			>
				{image ? (
					<img
						src={image.url}
						alt={`Sketch ${sketch.label}: ${sketch.idea}`}
						className="h-full w-full object-cover object-top"
						data-testid="sketch-image"
					/>
				) : (
					<ImageIcon
						className={cn(
							'text-muted-foreground size-6',
							!isError && 'animate-pulse'
						)}
					/>
				)}
			</a>
			<figcaption className="text-sm">
				<span className="font-semibold">{sketch.label}</span> {sketch.idea}
				{picked && (
					<span className="text-primary-700 ms-1 text-xs font-medium">
						· picked
					</span>
				)}
			</figcaption>
			<div className="flex flex-wrap gap-1">
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2 shadow-none"
					disabled={!image}
					onClick={copyImage}
					data-testid="sketch-copy-image"
				>
					<ClipboardCopy /> Copy image
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2 shadow-none"
					asChild
					data-testid="sketch-download"
				>
					<a href={image?.url} download={name}>
						<Download /> Download
					</a>
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2 shadow-none"
					onClick={copyBrief}
					data-testid="sketch-copy-brief"
				>
					<FileCode /> Copy brief
				</Button>
			</div>
		</figure>
	)
}
