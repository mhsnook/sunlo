import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { PhraseFullType } from '@/lib/schemas'
import {
	generateEmbeddings,
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
import { Loader } from '@/components/ui/loader'

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

	// Build phrase lookup map
	const phraseMap = useMemo(
		() => new Map(phrases.map((p) => [p.id, p])),
		[phrases]
	)

	// Generate embeddings on mount / when phrases change
	useEffect(() => {
		if (phrases.length === 0) return

		let cancelled = false

		generateEmbeddings(phrases, lang, (p) => {
			if (!cancelled) setProgress(p)
		})
			.then((result) => {
				if (!cancelled) {
					setEmbeddings(result)
					setError(null)
				}
			})
			.catch((err) => {
				if (!cancelled) {
					console.log('Error generating embeddings:', err)
					setError(
						'Failed to load the embedding model. Please check your connection and try again.'
					)
				}
			})

		return () => {
			cancelled = true
		}
	}, [phrases, lang])

	// Compute clusters and edges based on threshold
	const { clusters, edges, clusterMap } = useMemo(() => {
		if (embeddings.length === 0)
			return { clusters: [], edges: [], clusterMap: new Map<string, number>() }

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

	// Loading state
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

	if (phrases.length === 0) {
		return (
			<p className="text-muted-foreground py-12 text-center text-sm">
				No phrases available for this language yet.
			</p>
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
				{view === 'bubbles' ?
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
