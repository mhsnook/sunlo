import {
	useRef,
	useEffect,
	useState,
	useCallback,
	type PointerEvent as ReactPointerEvent,
	type WheelEvent as ReactWheelEvent,
} from 'react'
import {
	forceSimulation,
	forceManyBody,
	forceCenter,
	forceCollide,
	forceX,
	forceY,
	type SimulationNodeDatum,
} from 'd3-force'
import type { PhraseFullType } from '@/lib/schemas'
import type { Cluster } from '@/lib/clustering'
import { CLUSTER_COLORS } from './colors'

interface BubbleGraphViewProps {
	clusters: Array<Cluster>
	phraseMap: Map<string, PhraseFullType>
	onPhraseClick?: (phraseId: string) => void
}

type BubbleNode = SimulationNodeDatum & {
	id: string
	clusterId: number
	radius: number
	label: string
	phraseIds: Array<string>
}

export default function BubbleGraphView({
	clusters,
	phraseMap,
	onPhraseClick,
}: BubbleGraphViewProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
	const [bubbles, setBubbles] = useState<Array<BubbleNode>>([])
	const [expanded, setExpanded] = useState<number | null>(null)
	const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })

	// Measure container
	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		const observer = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect
			setDimensions({
				width: Math.max(width, 300),
				height: Math.max(height, 300),
			})
		})
		observer.observe(container)
		return () => observer.disconnect()
	}, [])

	// Build bubble simulation
	useEffect(() => {
		const bubbleNodes: Array<BubbleNode> = clusters.map((cluster) => {
			const centroidPhrase = phraseMap.get(cluster.centroidPhraseId)
			const label =
				centroidPhrase ?
					centroidPhrase.text.length > 25 ?
						centroidPhrase.text.slice(0, 25) + '…'
					:	centroidPhrase.text
				:	`Cluster ${cluster.id}`
			return {
				id: `cluster-${cluster.id}`,
				clusterId: cluster.id,
				radius: Math.max(24, Math.sqrt(cluster.phraseIds.length) * 22),
				label,
				phraseIds: cluster.phraseIds,
			}
		})

		const sim = forceSimulation<BubbleNode>(bubbleNodes)
			.force('charge', forceManyBody().strength(5))
			.force('center', forceCenter(dimensions.width / 2, dimensions.height / 2))
			.force(
				'collide',
				forceCollide<BubbleNode>((d) => d.radius + 6).strength(0.8)
			)
			.force('x', forceX(dimensions.width / 2).strength(0.05))
			.force('y', forceY(dimensions.height / 2).strength(0.05))
			.alphaDecay(0.03)

		sim.on('tick', () => {
			setBubbles([...sim.nodes()])
		})

		return () => {
			sim.stop()
		}
	}, [clusters, phraseMap, dimensions.width, dimensions.height])

	// Wheel zoom
	const handleWheel = useCallback((e: ReactWheelEvent) => {
		e.preventDefault()
		const scaleBy = e.deltaY > 0 ? 0.92 : 1.08
		const rect = containerRef.current?.getBoundingClientRect()
		if (!rect) return
		const mx = e.clientX - rect.left
		const my = e.clientY - rect.top

		setTransform((t) => {
			const newK = Math.min(Math.max(t.k * scaleBy, 0.15), 5)
			return {
				k: newK,
				x: mx - ((mx - t.x) / t.k) * newK,
				y: my - ((my - t.y) / t.k) * newK,
			}
		})
	}, [])

	// Pan
	const [panning, setPanning] = useState<{
		startX: number
		startY: number
		origX: number
		origY: number
	} | null>(null)

	const handlePointerDown = useCallback(
		(e: ReactPointerEvent<SVGSVGElement>) => {
			if ((e.target as Element).closest('[data-bubble]')) return
			setPanning({
				startX: e.clientX,
				startY: e.clientY,
				origX: transform.x,
				origY: transform.y,
			})
		},
		[transform.x, transform.y]
	)

	const handlePointerMove = useCallback(
		(e: ReactPointerEvent<SVGSVGElement>) => {
			if (!panning) return
			setTransform((t) => ({
				...t,
				x: panning.origX + (e.clientX - panning.startX),
				y: panning.origY + (e.clientY - panning.startY),
			}))
		},
		[panning]
	)

	const handlePointerUp = useCallback(() => {
		setPanning(null)
	}, [])

	const expandedCluster =
		expanded !== null ? clusters.find((c) => c.id === expanded) : null

	return (
		<div
			ref={containerRef}
			className="relative h-full min-h-96 w-full overflow-hidden rounded-2xl border"
		>
			<svg
				width={dimensions.width}
				height={dimensions.height}
				className="bg-background"
				onWheel={handleWheel}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerUp}
				style={{ touchAction: 'none' }}
			>
				<g
					transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
				>
					{bubbles.map((bubble) => {
						const color =
							CLUSTER_COLORS[bubble.clusterId % CLUSTER_COLORS.length]
						const isExpanded = expanded === bubble.clusterId
						return (
							<g
								key={bubble.id}
								data-bubble
								className="cursor-pointer"
								onClick={() =>
									setExpanded(isExpanded ? null : bubble.clusterId)
								}
							>
								<circle
									cx={bubble.x}
									cy={bubble.y}
									r={bubble.radius}
									fill={color}
									fillOpacity={isExpanded ? 0.3 : 0.2}
									stroke={color}
									strokeWidth={isExpanded ? 2.5 : 1.5}
									strokeOpacity={0.6}
								/>
								<text
									x={bubble.x}
									y={(bubble.y ?? 0) - 4}
									textAnchor="middle"
									className="fill-foreground pointer-events-none text-xs font-medium select-none"
								>
									{bubble.label}
								</text>
								<text
									x={bubble.x}
									y={(bubble.y ?? 0) + 12}
									textAnchor="middle"
									className="fill-muted-foreground pointer-events-none text-[10px] select-none"
								>
									{bubble.phraseIds.length} phrase
									{bubble.phraseIds.length !== 1 ? 's' : ''}
								</text>
							</g>
						)
					})}
				</g>
			</svg>

			{/* Expanded cluster panel */}
			{expandedCluster && (
				<div className="bg-background/95 absolute inset-x-0 bottom-0 max-h-64 overflow-y-auto border-t p-3 backdrop-blur-sm">
					<div className="mb-2 flex items-center justify-between">
						<h3 className="text-sm font-semibold">
							{phraseMap.get(expandedCluster.centroidPhraseId)?.text ??
								`Cluster ${expandedCluster.id}`}
						</h3>
						<button
							onClick={() => setExpanded(null)}
							className="text-muted-foreground hover:text-foreground text-xs"
						>
							Close
						</button>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{expandedCluster.phraseIds.map((pid) => {
							const phrase = phraseMap.get(pid)
							if (!phrase) return null
							const color =
								CLUSTER_COLORS[expandedCluster.id % CLUSTER_COLORS.length]
							return (
								<button
									key={pid}
									onClick={() => onPhraseClick?.(pid)}
									className="rounded-2xl border px-2.5 py-1 text-xs transition-colors hover:opacity-80"
									style={{
										borderColor: color,
										backgroundColor: color + '18',
									}}
								>
									{phrase.text}
								</button>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
