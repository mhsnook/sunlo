import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'

let mermaidLoad: Promise<typeof import('mermaid').default> | null = null

// Mermaid is large, so it loads with the first diagram on the page.
const loadMermaid = () =>
	(mermaidLoad ??= import('mermaid').then(({ default: mermaid }) => {
		mermaid.initialize({
			startOnLoad: false,
			securityLevel: 'strict',
			theme: 'neutral',
			// A gantt chart is laid out at this width, then scaled to fit, and
			// mermaid's own default of 1200 shrinks its text to half size in a
			// side panel. Full dates on its axis overlap at this width.
			gantt: { useWidth: 560, axisFormat: '%b %d' },
		})
		return mermaid
	}))

let drawings = 0

async function drawMermaid(source: string) {
	const mermaid = await loadMermaid()
	await mermaid.parse(source)
	// mermaid.render needs an element id no other drawing is using.
	return (await mermaid.render(`mermaid-${++drawings}`, source)).svg
}

// A ```mermaid block, such as a Roadmap's gantt chart. Agents write these
// as text the Worker cannot check, so one that fails shows its source.
export function MermaidBlock({ source }: { source: string }) {
	const diagram = useQuery({
		queryKey: ['mermaid', source],
		queryFn: () => drawMermaid(source),
		staleTime: Infinity,
		retry: false,
	})

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
		<figure
			className="my-3 overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
			data-testid="crew-block"
			data-key="mermaid"
			aria-busy={diagram.isPending}
			// Mermaid's strict mode sanitizes the SVG it returns.
			dangerouslySetInnerHTML={
				diagram.data ? { __html: diagram.data } : undefined
			}
		/>
	)
}
