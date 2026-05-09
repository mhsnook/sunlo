import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
} from 'react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Network } from 'lucide-react'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useAvailableLanguages } from '@/components/library-charts'
import supabase from '@/lib/supabase-client'
import languages from '@/lib/languages'
import { cn } from '@/lib/utils'

export const Route = createLazyFileRoute('/_user/browse/graph')({
	component: GraphPage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

type GraphNode = { id: string; text: string }
type GraphEdge = { source: string; target: string; similarity: number }
type GraphPayload = { nodes: GraphNode[]; edges: GraphEdge[] }

// Untyped RPC bridge — supabase types are regenerated separately and
// don't yet know about phrase_similarity_graph.
type RpcArgs = {
	target_lang: string
	node_limit?: number
	edges_per_node?: number
	min_similarity?: number
}
const rpcGraph = (
	fn: 'phrase_similarity_graph',
	args: RpcArgs
): Promise<{ data: GraphPayload | null; error: Error | null }> =>
	(
		supabase.rpc as unknown as (
			f: string,
			a: RpcArgs
		) => Promise<{ data: GraphPayload | null; error: Error | null }>
	)(fn, args)

const NODE_LIMIT = 80
const EDGES_PER_NODE = 4
const MIN_SIM = 0.55

function GraphPage() {
	const navigate = Route.useNavigate()
	const { lang: searchLang } = Route.useSearch()
	const availableLanguages = useAvailableLanguages()
	const activeLang = searchLang || availableLanguages[0]?.lang || ''
	const activeLanguage = availableLanguages.find((l) => l.lang === activeLang)

	const setSelectedLang = (value: string) => {
		void navigate({
			search: (prev) => ({ ...prev, lang: value }),
			replace: true,
		})
	}

	const { data, isLoading, error } = useQuery({
		queryKey: ['phrase-similarity-graph', activeLang],
		enabled: !!activeLang,
		staleTime: 5 * 60 * 1000,
		queryFn: async (): Promise<GraphPayload> => {
			const { data, error } = await rpcGraph('phrase_similarity_graph', {
				target_lang: activeLang,
				node_limit: NODE_LIMIT,
				edges_per_node: EDGES_PER_NODE,
				min_similarity: MIN_SIM,
			})
			if (error) throw error
			return data ?? { nodes: [], edges: [] }
		},
	})

	return (
		<main style={style} className="space-y-6 pb-16" data-testid="graph-page">
			<section>
				<h2 className="text-2xl font-bold">Phrase Similarity Graph</h2>
				<p className="text-muted-foreground">
					A force-directed map of phrases by semantic similarity (BGE-M3
					embeddings, cosine distance). Phrases that mean similar things settle
					near each other; thicker links mean stronger similarity. Click a
					phrase to open it.
				</p>
			</section>

			{availableLanguages.length > 0 && (
				<div className="flex flex-col items-start gap-2 @md:flex-row @md:items-center">
					<span className="text-muted-foreground text-sm font-medium">
						Show graph for:
					</span>
					<Select
						value={activeLang}
						onValueChange={(value) => {
							if (value !== null) setSelectedLang(value)
						}}
					>
						<SelectTrigger className="w-60 border">
							{activeLanguage ? (
								`${activeLanguage.name} (${activeLanguage.lang})`
							) : (
								<SelectValue placeholder="Select a language" />
							)}
						</SelectTrigger>
						<SelectContent>
							{availableLanguages.map((lang) => (
								<SelectItem key={lang.lang} value={lang.lang}>
									{lang.name} ({lang.lang})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			<Card>
				<CardHeader>
					<h3 className="text-lg font-semibold">
						{activeLanguage ? activeLanguage.name : 'Select a language'}
						{data?.nodes.length ? (
							<span className="text-muted-foreground ml-2 text-sm font-normal">
								{data.nodes.length} phrases · {data.edges.length} similarity
								links
							</span>
						) : null}
					</h3>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex h-[480px] items-center justify-center">
							<Loader />
						</div>
					) : error ? (
						<p className="text-muted-foreground py-12 text-center">
							Could not load similarity graph: {String(error)}
						</p>
					) : !data || data.nodes.length === 0 ? (
						<EmptyGraphState lang={activeLang} />
					) : (
						<ForceGraph data={data} lang={activeLang} />
					)}
				</CardContent>
			</Card>
		</main>
	)
}

function EmptyGraphState({ lang }: { lang: string }) {
	return (
		<div className="py-12 text-center">
			<Network className="text-muted-foreground mx-auto mb-4 size-12" />
			<p className="text-muted-foreground text-lg">
				Not enough indexed phrases to draw a graph for {languages[lang] ?? lang}{' '}
				yet.
			</p>
			<Link to="/browse" className={buttonVariants({ variant: 'soft' })}>
				Browse Languages
			</Link>
		</div>
	)
}

// ─── Force-directed simulation ──────────────────────────────────

type Particle = { x: number; y: number; vx: number; vy: number }

const WIDTH = 720
const HEIGHT = 480

// Tunable forces — picked by trial; converges to a readable layout in ~3s.
const REPULSION = 1800
const SPRING_STRENGTH = 0.04
const SPRING_REST = 90
const CENTER_PULL = 0.012
const DAMPING = 0.86
const MAX_VEL = 12

function ForceGraph({ data, lang }: { data: GraphPayload; lang: string }) {
	const { nodes, edges } = data
	const containerRef = useRef<HTMLDivElement>(null)
	const particlesRef = useRef<Particle[]>([])
	const rafRef = useRef<number | null>(null)
	const draggingRef = useRef<number | null>(null)

	// Hovered + selected node ids drive React-rendered styling.
	const [hovered, setHovered] = useState<string | null>(null)
	const [, setTick] = useState(0)

	const indexById = useMemo(() => {
		const m = new Map<string, number>()
		nodes.forEach((n, i) => m.set(n.id, i))
		return m
	}, [nodes])

	const adjacency = useMemo(() => {
		const adj = new Map<string, Set<string>>()
		for (const n of nodes) adj.set(n.id, new Set())
		for (const e of edges) {
			adj.get(e.source)?.add(e.target)
			adj.get(e.target)?.add(e.source)
		}
		return adj
	}, [nodes, edges])

	useEffect(() => {
		// Fresh particles whenever the graph data changes.
		const N = nodes.length
		const particles: Particle[] = Array.from({ length: N }, () => ({
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
		}))
		for (let i = 0; i < N; i++) {
			const angle = (i / N) * Math.PI * 2
			const r = 140 + Math.random() * 30
			particles[i] = {
				x: WIDTH / 2 + Math.cos(angle) * r,
				y: HEIGHT / 2 + Math.sin(angle) * r,
				vx: 0,
				vy: 0,
			}
		}
		particlesRef.current = particles

		const edgePairs = edges
			.map((e) => {
				const a = indexById.get(e.source)
				const b = indexById.get(e.target)
				if (a === undefined || b === undefined) return null
				return { a, b, sim: e.similarity }
			})
			.filter((x): x is { a: number; b: number; sim: number } => x !== null)

		let frame = 0
		const step = () => {
			frame++
			const ps = particlesRef.current
			const n = ps.length

			// Repulsion (Coulomb-like) between every pair.
			for (let i = 0; i < n; i++) {
				const pi = ps[i]
				for (let j = i + 1; j < n; j++) {
					const pj = ps[j]
					const dx = pi.x - pj.x
					const dy = pi.y - pj.y
					const distSq = dx * dx + dy * dy + 0.01
					const force = REPULSION / distSq
					const dist = Math.sqrt(distSq)
					const fx = (force * dx) / dist
					const fy = (force * dy) / dist
					pi.vx += fx
					pi.vy += fy
					pj.vx -= fx
					pj.vy -= fy
				}
			}

			// Spring pull along edges; stronger edge -> longer rest length is *shorter*.
			for (const { a, b, sim } of edgePairs) {
				const pa = ps[a]
				const pb = ps[b]
				const dx = pb.x - pa.x
				const dy = pb.y - pa.y
				const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
				const rest = SPRING_REST * (1.4 - sim) // sim≈1 → ~36px, sim≈0.55 → ~76px
				const k = SPRING_STRENGTH * (0.5 + sim)
				const f = k * (dist - rest)
				const fx = (f * dx) / dist
				const fy = (f * dy) / dist
				pa.vx += fx
				pa.vy += fy
				pb.vx -= fx
				pb.vy -= fy
			}

			// Center pull + damping + integrate.
			for (let i = 0; i < n; i++) {
				if (draggingRef.current === i) {
					ps[i].vx = 0
					ps[i].vy = 0
					continue
				}
				ps[i].vx += (WIDTH / 2 - ps[i].x) * CENTER_PULL
				ps[i].vy += (HEIGHT / 2 - ps[i].y) * CENTER_PULL
				ps[i].vx *= DAMPING
				ps[i].vy *= DAMPING
				if (ps[i].vx > MAX_VEL) ps[i].vx = MAX_VEL
				if (ps[i].vx < -MAX_VEL) ps[i].vx = -MAX_VEL
				if (ps[i].vy > MAX_VEL) ps[i].vy = MAX_VEL
				if (ps[i].vy < -MAX_VEL) ps[i].vy = -MAX_VEL
				ps[i].x += ps[i].vx
				ps[i].y += ps[i].vy
			}

			setTick((t) => (t + 1) & 0xffff)
			// Stop after enough frames to keep CPU idle, unless user is dragging.
			if (frame < 600 || draggingRef.current !== null) {
				rafRef.current = requestAnimationFrame(step)
			} else {
				rafRef.current = null
			}
		}

		rafRef.current = requestAnimationFrame(step)
		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
		}
	}, [nodes, edges, indexById])

	const ps = particlesRef.current

	// Node + edge styling helpers.
	const isHighlighted = (nodeId: string) => {
		if (!hovered) return true
		if (hovered === nodeId) return true
		return adjacency.get(hovered)?.has(nodeId) ?? false
	}

	const onPointerDownNode = (i: number, e: ReactPointerEvent<SVGElement>) => {
		e.preventDefault()
		;(e.target as Element).setPointerCapture?.(e.pointerId)
		draggingRef.current = i
		// Wake the simulation if it's idled.
		if (rafRef.current === null) {
			const tick = () => {
				rafRef.current = requestAnimationFrame(tick)
				setTick((t) => (t + 1) & 0xffff)
			}
			rafRef.current = requestAnimationFrame(tick)
		}
	}

	const onPointerMove = (e: ReactPointerEvent<SVGElement>) => {
		const i = draggingRef.current
		if (i === null) return
		const svg = (e.currentTarget as SVGElement).closest('svg')
		if (!svg) return
		const rect = svg.getBoundingClientRect()
		const x = ((e.clientX - rect.left) / rect.width) * WIDTH
		const y = ((e.clientY - rect.top) / rect.height) * HEIGHT
		const ps = particlesRef.current
		ps[i].x = x
		ps[i].y = y
		ps[i].vx = 0
		ps[i].vy = 0
	}

	const onPointerUp = () => {
		draggingRef.current = null
	}

	return (
		<div
			ref={containerRef}
			className="bg-0-lo-neutral relative w-full overflow-hidden rounded-xl border"
			style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
		>
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="absolute inset-0 h-full w-full select-none"
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerLeave={onPointerUp}
			>
				{ps.length === nodes.length && (
					<>
						<g>
							{edges.map((e) => {
								const ai = indexById.get(e.source)
								const bi = indexById.get(e.target)
								if (ai === undefined || bi === undefined) return null
								const a = ps[ai]
								const b = ps[bi]
								const active =
									!hovered || hovered === e.source || hovered === e.target
								return (
									<line
										key={`${e.source}-${e.target}`}
										x1={a.x}
										y1={a.y}
										x2={b.x}
										y2={b.y}
										strokeWidth={0.5 + (e.similarity - MIN_SIM) * 6}
										className={cn(
											'stroke-current transition-opacity',
											active
												? 'text-primary-foresoft opacity-60'
												: 'text-muted-foreground opacity-10'
										)}
									/>
								)
							})}
						</g>
						<g>
							{nodes.map((node, i) => {
								const p = ps[i]
								const highlighted = isHighlighted(node.id)
								const isHover = hovered === node.id
								return (
									<g
										key={node.id}
										transform={`translate(${p.x}, ${p.y})`}
										style={{ cursor: 'pointer' }}
										onPointerDown={(ev) => onPointerDownNode(i, ev)}
										onMouseEnter={() => setHovered(node.id)}
										onMouseLeave={() =>
											setHovered((h) => (h === node.id ? null : h))
										}
									>
										<Link
											to="/learn/$lang/phrases/$id"
											params={{ lang, id: node.id }}
										>
											<circle
												r={isHover ? 8 : 5}
												className={cn(
													'transition-all',
													highlighted
														? 'fill-primary stroke-1-mlo-primary'
														: 'fill-muted stroke-border opacity-40'
												)}
												strokeWidth={1.5}
											/>
											<text
												x={0}
												y={-10}
												textAnchor="middle"
												className={cn(
													'fill-foreground pointer-events-none text-[10px] font-medium transition-opacity',
													highlighted ? 'opacity-100' : 'opacity-30',
													isHover && 'text-xs'
												)}
											>
												{node.text.length > 22
													? node.text.slice(0, 21) + '…'
													: node.text}
											</text>
										</Link>
									</g>
								)
							})}
						</g>
					</>
				)}
			</svg>
		</div>
	)
}
