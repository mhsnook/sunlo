import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { PhraseFullType } from '@/lib/schemas'
import {
	generateEmbeddings,
	fetchServerEmbeddings,
	syncEmbeddingsToServer,
	type EmbeddingProgress,
	type PhraseEmbedding,
} from '@/lib/embeddings'
import {
	hierarchicalClustering,
	extractEdges,
	buildClusterMap,
} from '@/lib/clustering'
import GraphControls, { type GraphView } from './graph-controls'
import ForceGraphView from './force-graph-view'
import BubbleGraphView from './bubble-graph-view'
import RadialGraphView from './radial-graph-view'
import { Loader } from '@/components/ui/loader'
import { useIntro } from '@/hooks/use-intro-seen'
import { IntroSheet } from '@/components/intro-sheet'
import { useDeckCards } from '@/hooks/use-deck'

import { Button } from '@/components/ui/button'
import { BrainCircuit, Lock, Network, Wifi } from 'lucide-react'

interface PhraseGraphProps {
	phrases: Array<PhraseFullType>
	lang: string
}

export default function PhraseGraph({ phrases, lang }: PhraseGraphProps) {
	const navigate = useNavigate()
	const [view, setView] = useState<GraphView>('bubbles')
	const [threshold, setThreshold] = useState(0.5)
	const [embeddings, setEmbeddings] = useState<Array<PhraseEmbedding>>([])
	const [progress, setProgress] = useState<EmbeddingProgress | null>(null)
	const [error, setError] = useState<string | null>(null)

	const { isOpen, showCallout, handleClose } = useIntro('phrase-graph')
	const [started, setStarted] = useState(showCallout)

	// User's deck cards for radial view highlighting
	const { data: deckCards } = useDeckCards(lang)
	const userCardPids = useMemo(
		() => new Set((deckCards ?? []).map((c) => c.phrase_id)),
		[deckCards]
	)
	const userCardMap = useMemo(
		() => new Map((deckCards ?? []).map((c) => [c.phrase_id, c])),
		[deckCards]
	)

	const handleStart = () => {
		handleClose()
		setStarted(true)
	}

	// Build phrase lookup map
	const phraseMap = useMemo(
		() => new Map(phrases.map((p) => [p.id, p])),
		[phrases]
	)

	// Load embeddings: try server first, fall back to client-side generation
	useEffect(() => {
		if (!started || phrases.length === 0) return

		let cancelled = false
		const phraseIds = new Set(phrases.map((p) => p.id))

		async function loadEmbeddings() {
			// 1. Try fetching from server
			setProgress({
				stage: 'loading-model',
				progress: 0,
				embedded: 0,
				total: phrases.length,
			})

			const serverEmbeddings = await fetchServerEmbeddings(lang)
			if (cancelled) return

			// Filter to only embeddings for phrases we actually have
			const validServer =
				serverEmbeddings?.filter((e) => phraseIds.has(e.phraseId)) ?? []
			const coverage = validServer.length / phrases.length

			// 2. If server has ≥80% coverage, use immediately
			if (coverage >= 0.8) {
				setEmbeddings(validServer)
				setProgress({
					stage: 'done',
					progress: 1,
					embedded: validServer.length,
					total: phrases.length,
				})
				setError(null)

				// Compute missing phrases client-side in background
				const serverPids = new Set(validServer.map((e) => e.phraseId))
				const missing = phrases.filter((p) => !serverPids.has(p.id))
				if (missing.length > 0) {
					generateEmbeddings(missing, lang)
						.then((newEmbeddings) => {
							if (!cancelled) {
								setEmbeddings((prev) => [...prev, ...newEmbeddings])
								void syncEmbeddingsToServer(newEmbeddings)
							}
						})
						.catch(() => {})
				}
				return
			}

			// 3. Full client-side generation, then sync to server
			const result = await generateEmbeddings(phrases, lang, (p) => {
				if (!cancelled) setProgress(p)
			})
			if (cancelled) return

			setEmbeddings(result)
			setError(null)

			// Sync to server in background
			syncEmbeddingsToServer(result).catch(() => {})
		}

		loadEmbeddings().catch((err) => {
			if (!cancelled) {
				console.log('Error loading embeddings:', err)
				setError(
					'Failed to load the embedding model. Please check your connection and try again.'
				)
			}
		})

		return () => {
			cancelled = true
		}
	}, [started, phrases, lang])

	// Compute clusters and edges based on threshold
	const { clusters, edges, clusterMap } = useMemo(() => {
		if (embeddings.length === 0)
			return {
				clusters: [],
				edges: [],
				clusterMap: new Map<string, number>(),
			}

		const clusters = hierarchicalClustering(embeddings, threshold)
		const edgeThreshold = Math.max(threshold - 0.1, 0.15)
		const edges =
			view === 'force' ? extractEdges(embeddings, edgeThreshold) : []
		const clusterMap = buildClusterMap(clusters)

		return { clusters, edges, clusterMap }
	}, [embeddings, threshold, view])

	const handlePhraseClick = useCallback(
		(phraseId: string) => {
			void navigate({
				to: '/learn/$lang/phrases/$id',
				params: { lang, id: phraseId },
			})
		},
		[navigate, lang]
	)

	if (phrases.length === 0) {
		return (
			<p className="text-muted-foreground py-12 text-center text-sm">
				No phrases available for this language yet.
			</p>
		)
	}

	// Consent gate — show intro and landing state before starting
	if (!started) {
		return (
			<>
				<IntroSheet
					open={isOpen}
					onOpenChange={(o) => !o && handleClose()}
					title="Phrase Map"
					description="Explore how phrases in your language connect by meaning."
					actionLabel="Load phrase map"
					onAction={handleStart}
				>
					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<BrainCircuit className="text-primary mt-0.5 size-5 shrink-0" />
							<div>
								<p className="text-sm font-medium">
									AI-powered semantic analysis
								</p>
								<p className="text-muted-foreground text-sm">
									A small language model analyzes the meaning of each phrase and
									groups similar ones together into clusters you can explore.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Wifi className="text-primary mt-0.5 size-5 shrink-0" />
							<div>
								<p className="text-sm font-medium">
									~30 MB download on first visit
								</p>
								<p className="text-muted-foreground text-sm">
									The model is downloaded once and cached in your browser for
									future visits.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Lock className="text-primary mt-0.5 size-5 shrink-0" />
							<div>
								<p className="text-sm font-medium">
									Private and lightweight
								</p>
								<p className="text-muted-foreground text-sm">
									The model runs locally in your browser. Numeric embeddings
									(not phrase text) are cached on the server so future visitors
									skip the download.
								</p>
							</div>
						</div>
					</div>
				</IntroSheet>

				<div className="flex flex-col items-center justify-center gap-6 py-20">
					<Network className="text-muted-foreground/40 size-16" />
					<div className="text-center">
						<p className="text-lg font-medium">Phrase Map</p>
						<p className="text-muted-foreground mt-1 text-sm">
							See how {phrases.length} phrases connect by meaning
						</p>
					</div>
					<Button onClick={handleStart}>Load phrase map</Button>
				</div>
			</>
		)
	}

	// Error state
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-20">
				<p className="text-destructive text-sm">{error}</p>
				<button
					onClick={() => window.location.reload()}
					className="text-primary text-sm underline"
				>
					Reload page
				</button>
			</div>
		)
	}

	// Loading state
	if (
		progress &&
		progress.stage !== 'done' &&
		embeddings.length < phrases.length
	) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<Loader />
				<div className="text-center">
					<p className="text-sm font-medium">
						{progress.stage === 'loading-model' ?
							'Loading language model…'
						:	`Embedding phrases… ${progress.embedded}/${progress.total}`}
					</p>
					<p className="text-muted-foreground mt-1 text-xs">
						{progress.stage === 'loading-model' ?
							'This downloads ~30MB on first visit (cached after)'
						:	'Analyzing semantic meaning of each phrase'}
					</p>
				</div>
				{progress.stage === 'embedding' && (
					<div className="bg-muted h-2 w-48 overflow-hidden rounded-full">
						<div
							className="bg-primary h-full rounded-full transition-all"
							style={{
								width: `${Math.round(progress.progress * 100)}%`,
							}}
						/>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col gap-4">
			<GraphControls
				view={view}
				onViewChange={setView}
				threshold={threshold}
				onThresholdChange={setThreshold}
				clusterCount={clusters.length}
				phraseCount={phrases.length}
			/>

			<div className="min-h-0 flex-1">
				{view === 'radial' ?
					<RadialGraphView
						phrases={phrases}
						embeddings={embeddings}
						userCardPids={userCardPids}
						userCards={userCardMap}
						onPhraseClick={handlePhraseClick}
					/>
				: view === 'bubbles' ?
					<BubbleGraphView
						clusters={clusters}
						phraseMap={phraseMap}
						onPhraseClick={handlePhraseClick}
					/>
				:	<ForceGraphView
						phrases={phrases}
						edges={edges}
						clusters={clusters}
						clusterMap={clusterMap}
						onPhraseClick={handlePhraseClick}
					/>
				}
			</div>
		</div>
	)
}
