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
	forceLink,
	forceManyBody,
	forceCenter,
	forceCollide,
	type SimulationNodeDatum,
	type SimulationLinkDatum,
} from 'd3-force'
import type { PhraseFullType } from '@/lib/schemas'
import type { Cluster, GraphEdge } from '@/lib/clustering'
import PhraseTooltip from './phrase-tooltip'
import { CLUSTER_COLORS } from './colors'

interface ForceGraphViewProps {
	phrases: Array<PhraseFullType>
	edges: Array<GraphEdge>
	clusters: Array<Cluster>
	clusterMap: Map<string, number>
	onPhraseClick?: (phraseId: string) => void
}

type GraphNode = SimulationNodeDatum & {
	id: string
	phrase: PhraseFullType
	clusterId: number
}

type GraphLink = SimulationLinkDatum<GraphNode> & {
	similarity: number
}

export default function ForceGraphView({
	phrases,
	edges,
	clusters,
	clusterMap,
	onPhraseClick,
}: ForceGraphViewProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
	const [nodes, setNodes] = useState<Array<GraphNode>>([])
	const [links, setLinks] = useState<Array<GraphLink>>([])
	const [tooltip, setTooltip] = useState<{
		phrase: PhraseFullType | undefined
		x: number
		y: number
		visible: boolean
	}>({ phrase: undefined, x: 0, y: 0, visible: false })
	const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
	const [dragging, setDragging] = useState<{
		nodeId: string
		startX: number
		startY: number
	} | null>(null)

	const simulationRef = useRef<ReturnType<
		typeof forceSimulation<GraphNode>
	> | null>(null)

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

	// Build simulation
	useEffect(() => {
		const graphNodes: Array<GraphNode> = phrases.map((p) => ({
			id: p.id,
			phrase: p,
			clusterId: clusterMap.get(p.id) ?? 0,
		}))

		const nodeIndex = new Map(graphNodes.map((n, i) => [n.id, i]))
		const graphLinks: Array<GraphLink> = edges
			.filter((e) => nodeIndex.has(e.source) && nodeIndex.has(e.target))
			.map((e) => ({
				source: e.source,
				target: e.target,
				similarity: e.similarity,
			}))

		const sim = forceSimulation<GraphNode>(graphNodes)
			.force(
				'link',
				forceLink<GraphNode, GraphLink>(graphLinks)
					.id((d) => d.id)
					.distance((d) => 80 * (1 - d.similarity))
					.strength((d) => d.similarity * 0.5)
			)
			.force('charge', forceManyBody().strength(-60))
			.force('center', forceCenter(dimensions.width / 2, dimensions.height / 2))
			.force('collide', forceCollide(14))
			.alphaDecay(0.02)

		sim.on('tick', () => {
			setNodes([...sim.nodes()])
			setLinks([...graphLinks])
		})

		simulationRef.current = sim

		return () => {
			sim.stop()
		}
	}, [
		phrases,
		edges,
		clusters,
		clusterMap,
		dimensions.width,
		dimensions.height,
	])

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
			// If clicking on a node, don't pan
			if ((e.target as Element).closest('[data-node]')) return
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
			if (panning) {
				setTransform((t) => ({
					...t,
					x: panning.origX + (e.clientX - panning.startX),
					y: panning.origY + (e.clientY - panning.startY),
				}))
			}
			if (dragging && simulationRef.current) {
				const rect = containerRef.current?.getBoundingClientRect()
				if (!rect) return
				const x = (e.clientX - rect.left - transform.x) / transform.k
				const y = (e.clientY - rect.top - transform.y) / transform.k
				const node = simulationRef.current
					.nodes()
					.find((n) => n.id === dragging.nodeId)
				if (node) {
					node.fx = x
					node.fy = y
					simulationRef.current.alpha(0.3).restart()
				}
			}
		},
		[panning, dragging, transform.x, transform.y, transform.k]
	)

	const handlePointerUp = useCallback(() => {
		setPanning(null)
		if (dragging && simulationRef.current) {
			const node = simulationRef.current
				.nodes()
				.find((n) => n.id === dragging.nodeId)
			if (node) {
				node.fx = null
				node.fy = null
			}
			setDragging(null)
		}
	}, [dragging])

	const handleNodePointerDown = useCallback(
		(e: ReactPointerEvent<SVGCircleElement>, nodeId: string) => {
			e.stopPropagation()
			const rect = containerRef.current?.getBoundingClientRect()
			if (!rect) return
			setDragging({
				nodeId,
				startX: e.clientX,
				startY: e.clientY,
			})
		},
		[]
	)

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
					{/* Edges */}
					{links.map((link, i) => {
						const source = link.source as GraphNode
						const target = link.target as GraphNode
						if (!source.x || !source.y || !target.x || !target.y) return null
						return (
							<line
								key={i}
								x1={source.x}
								y1={source.y}
								x2={target.x}
								y2={target.y}
								stroke="currentColor"
								strokeOpacity={0.06 + link.similarity * 0.12}
								strokeWidth={1}
							/>
						)
					})}

					{/* Nodes */}
					{nodes.map((node) => {
						const color = CLUSTER_COLORS[node.clusterId % CLUSTER_COLORS.length]
						return (
							<circle
								key={node.id}
								data-node
								cx={node.x}
								cy={node.y}
								r={8}
								fill={color}
								fillOpacity={0.7}
								stroke={color}
								strokeWidth={1.5}
								strokeOpacity={0.9}
								className="hover:r-[12] cursor-pointer transition-[r]"
								onPointerDown={(e) => handleNodePointerDown(e, node.id)}
								onPointerEnter={(e) => {
									const rect = containerRef.current?.getBoundingClientRect()
									if (!rect) return
									setTooltip({
										phrase: node.phrase,
										x: e.clientX - rect.left,
										y: e.clientY - rect.top,
										visible: true,
									})
								}}
								onPointerLeave={() =>
									setTooltip((t) => ({
										...t,
										visible: false,
									}))
								}
								onClick={() => onPhraseClick?.(node.id)}
							/>
						)
					})}

					{/* Labels for small graphs */}
					{nodes.length < 60 &&
						nodes.map((node) => (
							<text
								key={`label-${node.id}`}
								x={(node.x ?? 0) + 12}
								y={(node.y ?? 0) + 4}
								className="fill-foreground/60 pointer-events-none text-[10px] select-none"
							>
								{node.phrase.text.length > 20 ?
									node.phrase.text.slice(0, 20) + '…'
								:	node.phrase.text}
							</text>
						))}
				</g>
			</svg>

			<PhraseTooltip {...tooltip} />
		</div>
	)
}
