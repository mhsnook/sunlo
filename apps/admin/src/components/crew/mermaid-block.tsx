import { useState, type MouseEvent } from 'react'
import {
	useQuery,
	useQueryClient,
	type QueryClient,
} from '@tanstack/react-query'
import { Images, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { sketchImageQuery } from '~/lib/crew'
import { SketchViewer, type ViewerScreen } from './sketch-viewer'

type Mode = 'light' | 'dark'

let mermaidLoad: Promise<typeof import('mermaid').default> | null = null

// Mermaid is large, so it loads with the first diagram on the page.
const loadMermaid = () =>
	(mermaidLoad ??= import('mermaid').then(({ default: mermaid }) => mermaid))

let drawings = 0

async function drawMermaid(source: string, mode: Mode) {
	const mermaid = await loadMermaid()
	// initialize() replaces the whole config, so every option goes in here;
	// render() reads whatever the last call set.
	mermaid.initialize({
		startOnLoad: false,
		securityLevel: 'strict',
		theme: mode === 'dark' ? 'dark' : 'neutral',
		// A gantt chart is laid out at this width, then scaled to fit, and
		// mermaid's own default of 1200 shrinks its text to half size in a
		// side panel. Full dates on its axis overlap at this width.
		gantt: { useWidth: 560, axisFormat: '%b %d' },
	})
	await mermaid.parse(source)
	// mermaid.render needs an element id no other drawing is using.
	return (await mermaid.render(`mermaid-${++drawings}`, source)).svg
}

// A node drawn with `img: "sketch:41"` shows that sketch's picture. Mermaid
// measures an image by loading it, and the sketch's URL needs the admin's
// token, so each picture goes into the source as a small data URI.
const SKETCH_NODE = /@\{[^}]*?img:\s*"sketch:(\d+)"[^}]*\}/g
const NODE_LABEL = /label:\s*"([^"]*)"/

// The sketches a diagram shows, in the order its source names them.
export function sketchScreens(source: string): Array<ViewerScreen> {
	const screens = new Map<number, ViewerScreen>()
	for (const match of source.matchAll(SKETCH_NODE)) {
		const id = Number(match[1])
		const label = NODE_LABEL.exec(match[0])?.[1]
		if (!screens.has(id))
			screens.set(id, { id, title: label || `Sketch ${id}` })
	}
	return [...screens.values()]
}

const THUMBNAIL_WIDTH = 240

async function thumbnail(blob: Blob) {
	const bitmap = await createImageBitmap(blob)
	const scale = Math.min(1, THUMBNAIL_WIDTH / bitmap.width)
	const canvas = document.createElement('canvas')
	canvas.width = Math.round(bitmap.width * scale)
	canvas.height = Math.round(bitmap.height * scale)
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
	bitmap.close()
	return canvas.toDataURL('image/jpeg', 0.82)
}

// A grey picture for a sketch that did not load, so the rest still draws.
const missingPicture = () => {
	const canvas = document.createElement('canvas')
	canvas.width = 12
	canvas.height = 26
	const context = canvas.getContext('2d')
	if (context) {
		context.fillStyle = '#d4d4d4'
		context.fillRect(0, 0, canvas.width, canvas.height)
	}
	return canvas.toDataURL('image/png')
}

// The source with each sketch's picture in place, and the sketch each
// picture stands for, by its data URI.
async function withSketches(
	source: string,
	screens: Array<ViewerScreen>,
	queryClient: QueryClient
) {
	const pictures = new Map<number, string>()
	await Promise.all(
		screens.map(async ({ id }) => {
			const picture = await queryClient
				.fetchQuery(sketchImageQuery(id))
				.then((image) => thumbnail(image.blob))
				.catch(missingPicture)
			pictures.set(id, picture)
		})
	)
	const sketchByPicture = new Map(
		[...pictures].map(([id, picture]) => [picture, id])
	)
	const drawn = source.replace(/"sketch:(\d+)"/g, (whole, id: string) => {
		const picture = pictures.get(Number(id))
		return picture ? `"${picture}"` : whole
	})
	return { drawn, sketchByPicture }
}

const useMode = (): Mode => {
	const { theme } = useTheme()
	if (theme !== 'system') return theme
	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light'
}

// A ```mermaid block, such as a Roadmap's gantt chart. Agents write these
// as text the Worker cannot check, so one that fails shows its source.
export function MermaidBlock({ source }: { source: string }) {
	const mode = useMode()
	const queryClient = useQueryClient()
	const screens = sketchScreens(source)
	const [viewing, setViewing] = useState<number | null>(null)
	const diagram = useQuery({
		queryKey: ['mermaid', mode, source],
		queryFn: async () => {
			const { drawn, sketchByPicture } = await withSketches(
				source,
				screens,
				queryClient
			)
			return { svg: await drawMermaid(drawn, mode), sketchByPicture }
		},
		staleTime: Infinity,
		retry: false,
	})
	const openSketch = (event: MouseEvent) => {
		// An image node's group is classed by its shape (image-shape), not
		// "node" as other shapes are.
		const picture = (event.target as Element)
			.closest('g.nodes > g')
			?.querySelector('image')
		const href =
			picture?.getAttribute('href') ?? picture?.getAttribute('xlink:href')
		const id = href ? diagram.data?.sketchByPicture.get(href) : undefined
		const index = screens.findIndex((screen) => screen.id === id)
		if (index !== -1) setViewing(index)
	}

	if (diagram.isError) {
		return (
			<figure className="my-3 space-y-1" data-testid="crew-diagram-error">
				<figcaption className="text-warning-800 flex items-center gap-1.5 text-xs font-medium">
					<TriangleAlert className="size-3.5" /> This diagram could not be
					drawn, so here is its source.
				</figcaption>
				<pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
					{source}
				</pre>
			</figure>
		)
	}
	return (
		<div className="my-3 space-y-1">
			{/* The "Page through" button below is the keyboard way to the same
			    screens, since a node inside Mermaid's SVG cannot take focus. */}
			{/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
			<figure
				className="overflow-x-auto [&_image]:cursor-pointer [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
				data-testid="crew-block"
				data-key="mermaid"
				aria-busy={diagram.isPending}
				onClick={screens.length ? openSketch : undefined}
				// Mermaid's strict mode sanitizes the SVG it returns.
				dangerouslySetInnerHTML={
					diagram.data ? { __html: diagram.data.svg } : undefined
				}
			/>
			{screens.length > 0 && (
				<>
					<Button
						size="sm"
						variant="ghost"
						className="text-muted-foreground h-7 px-2 shadow-none"
						onClick={() => setViewing(0)}
						data-testid="crew-diagram-screens"
					>
						<Images /> Page through {screens.length} screen
						{screens.length === 1 ? '' : 's'}
					</Button>
					<SketchViewer
						screens={screens}
						index={viewing}
						onIndex={setViewing}
					/>
				</>
			)}
		</div>
	)
}
