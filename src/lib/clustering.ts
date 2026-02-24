import { cosineSimilarity, type PhraseEmbedding } from './embeddings'

export type Cluster = {
	id: number
	phraseIds: Array<string>
	/** The phrase ID closest to the cluster centroid */
	centroidPhraseId: string
}

export type GraphEdge = {
	source: string
	target: string
	similarity: number
}

/**
 * Build a pairwise similarity matrix from embeddings.
 * Returns a flat Float32Array indexed as [i * n + j].
 */
function buildSimilarityMatrix(
	embeddings: Array<PhraseEmbedding>
): Float32Array {
	const n = embeddings.length
	const matrix = new Float32Array(n * n)

	for (let i = 0; i < n; i++) {
		matrix[i * n + i] = 1.0
		for (let j = i + 1; j < n; j++) {
			const sim = cosineSimilarity(embeddings[i].vector, embeddings[j].vector)
			matrix[i * n + j] = sim
			matrix[j * n + i] = sim
		}
	}

	return matrix
}

/**
 * Hierarchical agglomerative clustering using average linkage.
 *
 * @param embeddings - Array of phrase embeddings
 * @param threshold - Similarity threshold for merging (higher = fewer, larger clusters)
 * @returns Array of clusters
 */
export function hierarchicalClustering(
	embeddings: Array<PhraseEmbedding>,
	threshold: number
): Array<Cluster> {
	const n = embeddings.length
	if (n === 0) return []

	const simMatrix = buildSimilarityMatrix(embeddings)

	// Each phrase starts in its own cluster
	// clusterOf[i] = which cluster index phrase i belongs to
	const clusterOf = new Int32Array(n)
	for (let i = 0; i < n; i++) clusterOf[i] = i

	// Track cluster membership lists
	const clusters: Array<Array<number>> = Array.from({ length: n }, (_, i) => [
		i,
	])
	const active = new Set<number>(Array.from({ length: n }, (_, i) => i))

	// Iteratively merge the two most similar clusters
	while (active.size > 1) {
		let bestSim = -Infinity
		let bestA = -1
		let bestB = -1

		const activeArr = Array.from(active)

		// Find the pair of clusters with highest average similarity
		for (let ai = 0; ai < activeArr.length; ai++) {
			for (let bi = ai + 1; bi < activeArr.length; bi++) {
				const a = activeArr[ai]
				const b = activeArr[bi]

				// Average linkage: mean similarity between all pairs
				let sum = 0
				for (const i of clusters[a]) {
					for (const j of clusters[b]) {
						sum += simMatrix[i * n + j]
					}
				}
				const avgSim = sum / (clusters[a].length * clusters[b].length)

				if (avgSim > bestSim) {
					bestSim = avgSim
					bestA = a
					bestB = b
				}
			}
		}

		// Stop if best similarity is below threshold
		if (bestSim < threshold) break

		// Merge bestB into bestA
		for (const i of clusters[bestB]) {
			clusters[bestA].push(i)
			clusterOf[i] = bestA
		}
		clusters[bestB] = []
		active.delete(bestB)
	}

	// Build result clusters
	const result: Array<Cluster> = []
	let clusterId = 0

	for (const ci of active) {
		const members = clusters[ci]
		if (members.length === 0) continue

		// Find the member closest to centroid (highest avg similarity to others)
		let bestCentroid = members[0]
		let bestAvgSim = -Infinity

		if (members.length > 1) {
			for (const i of members) {
				let sum = 0
				for (const j of members) {
					if (i !== j) sum += simMatrix[i * n + j]
				}
				const avg = sum / (members.length - 1)
				if (avg > bestAvgSim) {
					bestAvgSim = avg
					bestCentroid = i
				}
			}
		}

		result.push({
			id: clusterId++,
			phraseIds: members.map((i) => embeddings[i].phraseId),
			centroidPhraseId: embeddings[bestCentroid].phraseId,
		})
	}

	return result
}

/**
 * Extract edges (pairs of phrases with similarity above threshold)
 * for the force-directed graph view.
 */
export function extractEdges(
	embeddings: Array<PhraseEmbedding>,
	edgeThreshold: number
): Array<GraphEdge> {
	const edges: Array<GraphEdge> = []

	for (let i = 0; i < embeddings.length; i++) {
		for (let j = i + 1; j < embeddings.length; j++) {
			const sim = cosineSimilarity(embeddings[i].vector, embeddings[j].vector)
			if (sim >= edgeThreshold) {
				edges.push({
					source: embeddings[i].phraseId,
					target: embeddings[j].phraseId,
					similarity: sim,
				})
			}
		}
	}

	return edges
}

/** Map from phraseId to cluster id for quick lookup */
export function buildClusterMap(clusters: Array<Cluster>): Map<string, number> {
	const map = new Map<string, number>()
	for (const cluster of clusters) {
		for (const pid of cluster.phraseIds) {
			map.set(pid, cluster.id)
		}
	}
	return map
}
