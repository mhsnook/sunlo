import type { PhraseEmbedding } from './embeddings'

/**
 * Project high-dimensional embeddings to 1D angular positions using
 * power iteration PCA (first principal component) mapped to [0, 2π].
 *
 * No external dependencies. O(n × d × iterations), fast for <5000 phrases.
 */
export function embeddings1DAngular(
	embeddings: Array<PhraseEmbedding>
): Array<{ phraseId: string; angle: number }> {
	if (embeddings.length === 0) return []

	const n = embeddings.length
	const d = embeddings[0].vector.length

	// 1. Compute mean vector
	const mean = new Float64Array(d)
	for (const e of embeddings) {
		for (let j = 0; j < d; j++) {
			mean[j] += e.vector[j]
		}
	}
	for (let j = 0; j < d; j++) {
		mean[j] /= n
	}

	// 2. Center the data (subtract mean)
	const centered = embeddings.map((e) => {
		const v = new Float64Array(d)
		for (let j = 0; j < d; j++) {
			v[j] = e.vector[j] - mean[j]
		}
		return v
	})

	// 3. Power iteration to find first principal component
	// Initialize with a random-ish unit vector (use first centered vector if nonzero)
	let pc = new Float64Array(d)
	const init = centered.find((v) => v.some((x) => x !== 0)) ?? centered[0]
	if (init) {
		pc.set(init)
	} else {
		pc[0] = 1
	}
	normalize(pc)

	const ITERATIONS = 50
	for (let iter = 0; iter < ITERATIONS; iter++) {
		// Multiply by covariance matrix: pc_new = X^T * (X * pc)
		const next = new Float64Array(d)
		for (const row of centered) {
			// dot = row · pc
			let dot = 0
			for (let j = 0; j < d; j++) {
				dot += row[j] * pc[j]
			}
			// next += dot * row
			for (let j = 0; j < d; j++) {
				next[j] += dot * row[j]
			}
		}
		normalize(next)
		pc = next
	}

	// 4. Project each embedding onto PC1
	const projections = centered.map((v) => {
		let dot = 0
		for (let j = 0; j < d; j++) {
			dot += v[j] * pc[j]
		}
		return dot
	})

	// 5. Map projections to [0, 2π]
	let min = Infinity
	let max = -Infinity
	for (const p of projections) {
		if (p < min) min = p
		if (p > max) max = p
	}
	const range = max - min || 1

	return embeddings.map((e, i) => ({
		phraseId: e.phraseId,
		angle: ((projections[i] - min) / range) * 2 * Math.PI,
	}))
}

function normalize(v: Float64Array): void {
	let norm = 0
	for (let i = 0; i < v.length; i++) {
		norm += v[i] * v[i]
	}
	norm = Math.sqrt(norm)
	if (norm > 0) {
		for (let i = 0; i < v.length; i++) {
			v[i] /= norm
		}
	}
}
