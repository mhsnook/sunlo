import {
	useRef,
	useEffect,
	useState,
	useCallback,
	useMemo,
	type PointerEvent as ReactPointerEvent,
	type WheelEvent as ReactWheelEvent,
} from 'react'
import type { PhraseFullType } from '@/lib/schemas'
import type { CardMetaType } from '@/lib/schemas'
import type { PhraseEmbedding } from '@/lib/embeddings'
import { embeddings1DAngular } from '@/lib/dim-reduce'
import PhraseTooltip from './phrase-tooltip'

interface RadialGraphViewProps {
	phrases: Array<PhraseFullType>
	embeddings: Array<PhraseEmbedding>
	userCardPids: Set<string>
	userCards: Map<string, CardMetaType>
	onPhraseClick?: (phraseId: string) => void
}

/** Map difficulty (1–10, nullable) to a 0–1 range for radius */
function difficultyToRadius(diff: number | null): number {
	const d = diff ?? 5.0
	// Clamp to [1, 10], then map to [0.15, 0.95] of available radius
	return 0.15 + (Math.min(Math.max(d, 1), 10) - 1) * (0.8 / 9)
}

/** Guide ring difficulties and labels */
const GUIDE_RINGS = [
	{ difficulty: 2, label: 'Easy' },
	{ difficulty: 4, label: '' },
	{ difficulty: 6, label: '' },
	{ difficulty: 8, label: 'Hard' },
]

/** Color for user card based on status */
function cardColor(card: CardMetaType): string {
	if (card.status !== 'active') return 'oklch(0.55 0.1 0)'
	const d = card.difficulty ?? 5
	// Green for easy, amber for medium, red for hard
	if (d < 4) return 'oklch(0.65 0.18 145)'
	if (d < 7) return 'oklch(0.7 0.16 85)'
	return 'oklch(0.6 0.18 25)'
}

export default function RadialGraphView({
	phrases,
	embeddings,
	userCardPids,
	userCards,
	onPhraseClick,
}: RadialGraphViewProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
	const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
	const [tooltip, setTooltip] = useState<{
		phrase: PhraseFullType | undefined
		x: number
		y: number
		visible: boolean
	}>({ phrase: undefined, x: 0, y: 0, visible: false })

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

	// Compute angular positions from embeddings
	const angleMap = useMemo(() => {
		const angles = embeddings1DAngular(embeddings)
		return new Map(angles.map((a) => [a.phraseId, a.angle]))
	}, [embeddings])

	// Build phrase lookup
	const phraseMap = useMemo(
		() => new Map(phrases.map((p) => [p.id, p])),
		[phrases]
	)

	// Compute node positions
	const nodes = useMemo(() => {
		const cx = dimensions.width / 2
		const cy = dimensions.height / 2
		const maxRadius = Math.min(cx, cy) * 0.9

		return phrases
			.filter((p) => angleMap.has(p.id))
			.map((p) => {
				const angle = angleMap.get(p.id)!
				const rNorm = difficultyToRadius(p.avg_difficulty)
				const r = rNorm * maxRadius
				const isUserCard = userCardPids.has(p.id)
				const card = userCards.get(p.id)

				return {
					id: p.id,
					x: cx + r * Math.cos(angle),
					y: cy + r * Math.sin(angle),
					isUserCard,
					card,
					radius: isUserCard ? 6 : 3.5,
				}
			})
	}, [phrases, angleMap, userCardPids, userCards, dimensions])

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
		},
		[panning]
	)

	const handlePointerUp = useCallback(() => {
		setPanning(null)
	}, [])

	const cx = dimensions.width / 2
	const cy = dimensions.height / 2
	const maxRadius = Math.min(cx, cy) * 0.9

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
					{/* Guide rings */}
					{GUIDE_RINGS.map((ring) => {
						const rNorm = difficultyToRadius(ring.difficulty)
						const r = rNorm * maxRadius
						return (
							<g key={ring.difficulty}>
								<circle
									cx={cx}
									cy={cy}
									r={r}
									fill="none"
									stroke="currentColor"
									strokeOpacity={0.08}
									strokeWidth={1}
									strokeDasharray="4 4"
								/>
								{ring.label && (
									<text
										x={cx + r + 4}
										y={cy - 4}
										className="fill-foreground/30 pointer-events-none text-[10px] select-none"
									>
										{ring.label}
									</text>
								)}
							</g>
						)
					})}

					{/* Community phrases (non-user cards first, so user cards render on top) */}
					{nodes
						.filter((n) => !n.isUserCard)
						.map((node) => (
							<circle
								key={node.id}
								data-node
								cx={node.x}
								cy={node.y}
								r={node.radius}
								fill="none"
								stroke="currentColor"
								strokeOpacity={0.2}
								strokeWidth={1}
								className="cursor-pointer hover:stroke-[2]"
								onPointerEnter={(e) => {
									const rect =
										containerRef.current?.getBoundingClientRect()
									if (!rect) return
									setTooltip({
										phrase: phraseMap.get(node.id),
										x: e.clientX - rect.left,
										y: e.clientY - rect.top,
										visible: true,
									})
								}}
								onPointerLeave={() =>
									setTooltip((t) => ({ ...t, visible: false }))
								}
								onClick={() => onPhraseClick?.(node.id)}
							/>
						))}

					{/* User's deck phrases */}
					{nodes
						.filter((n) => n.isUserCard)
						.map((node) => {
							const color = node.card
								? cardColor(node.card)
								: 'oklch(0.65 0.2 260)'
							return (
								<circle
									key={node.id}
									data-node
									cx={node.x}
									cy={node.y}
									r={node.radius}
									fill={color}
									fillOpacity={0.8}
									stroke={color}
									strokeWidth={1.5}
									className="cursor-pointer hover:r-[10]"
									onPointerEnter={(e) => {
										const rect =
											containerRef.current?.getBoundingClientRect()
										if (!rect) return
										setTooltip({
											phrase: phraseMap.get(node.id),
											x: e.clientX - rect.left,
											y: e.clientY - rect.top,
											visible: true,
										})
									}}
									onPointerLeave={() =>
										setTooltip((t) => ({ ...t, visible: false }))
									}
									onClick={() => onPhraseClick?.(node.id)}
								/>
							)
						})}
				</g>
			</svg>

			<PhraseTooltip {...tooltip} />
		</div>
	)
}
