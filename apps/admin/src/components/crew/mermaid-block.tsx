import { useState, type MouseEvent } from 'react'
import {
	queryOptions,
	useQuery,
	useQueryClient,
	type QueryClient,
} from '@tanstack/react-query'
import { Images, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { sketchImageQuery } from '~/lib/crew'
import { asDataUrl, encode } from '~/lib/images'
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
	const renderId = `mermaid-${++drawings}`
	return { svg: (await mermaid.render(renderId, source)).svg, renderId }
}

// A node drawn with `img: "sketch:41"` shows that sketch's picture. Mermaid
// measures an image by loading it, and the sketch's URL needs the admin's
// token, so each picture goes into the source as a small data URI.
const SKETCH_NODE = /([\w-]+)@\{[^}]*?img:\s*"sketch:(\d+)"[^}]*\}/g
const NODE_LABEL = /label:\s*"([^"]*)"/

// The sketches a diagram shows, in the order its source names them, and
// the sketch behind each node id.
function sketchNodes(source: string) {
	const screens = new Map<number, ViewerScreen>()
	const sketchByNode = new Map<string, number>()
	for (const match of source.matchAll(SKETCH_NODE)) {
		const id = Number(match[2])
		sketchByNode.set(match[1], id)
		const label = NODE_LABEL.exec(match[0])?.[1]
		if (!screens.has(id))
			screens.set(id, { id, title: label || `Sketch ${id}` })
	}
	return { screens: [...screens.values()], sketchByNode }
}

const THUMBNAIL_WIDTH = 240

// A thumbnail is the same in either theme, so it is cached by sketch.
const thumbnailQuery = (id: number, queryClient: QueryClient) =>
	queryOptions({
		queryKey: ['crew', 'sketch', id, 'thumbnail'],
		queryFn: async () => {
			const { blob } = await queryClient.fetchQuery(sketchImageQuery(id))
			const bitmap = await createImageBitmap(blob)
			const scale = Math.min(1, THUMBNAIL_WIDTH / bitmap.width)
			try {
				return await asDataUrl(
					await encode(
						bitmap,
						Math.round(bitmap.width * scale),
						Math.round(bitmap.height * scale),
						'image/jpeg',
						0.82
					)
				)
			} finally {
				bitmap.close()
			}
		},
		staleTime: Infinity,
		retry: false,
	})

// A grey picture for a sketch that did not load, so the rest still draws.
const MISSING_PICTURE =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="26"><rect width="12" height="26" fill="#d4d4d4"/></svg>'
	)

async function withSketches(
	source: string,
	screens: Array<ViewerScreen>,
	queryClient: QueryClient
) {
	const pictures = new Map(
		await Promise.all(
			screens.map(
				async ({ id }) =>
					[
						id,
						await queryClient
							.fetchQuery(thumbnailQuery(id, queryClient))
							.catch(() => MISSING_PICTURE),
					] as const
			)
		)
	)
	return source.replace(/"sketch:(\d+)"/g, (whole, id: string) => {
		const picture = pictures.get(Number(id))
		return picture ? `"${picture}"` : whole
	})
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
	const { screens, sketchByNode } = sketchNodes(source)
	const [viewing, setViewing] = useState<number | null>(null)
	const diagram = useQuery({
		queryKey: ['mermaid', mode, source],
		queryFn: async () => {
			void loadMermaid()
			return drawMermaid(await withSketches(source, screens, queryClient), mode)
		},
		staleTime: Infinity,
		retry: false,
	})
	const openSketch = (event: MouseEvent) => {
		// An image node's group is classed by its shape (image-shape), not
		// "node" as other shapes are. Its id is
		// <render id>-flowchart-<node id>-<n>.
		const group = (event.target as Element).closest('g.nodes > g')
		const prefix = `${diagram.data?.renderId}-flowchart-`
		if (!group?.id.startsWith(prefix)) return
		const node = group.id.slice(prefix.length).replace(/-\d+$/, '')
		const id = sketchByNode.get(node)
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
