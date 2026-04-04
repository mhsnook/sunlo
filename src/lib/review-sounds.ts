/**
 * Synthesized feedback sounds for review scoring.
 * Uses Web Audio API — no external files, works offline.
 * Triggered by user gesture (button click) so no autoplay issues.
 */

import type { Score } from '@/features/review/fsrs'

// Track live contexts and pending timeouts so we can abort at any time.
const activeContexts = new Set<AudioContext>()
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>()

function track(id: ReturnType<typeof setTimeout>) {
	pendingTimeouts.add(id)
	return id
}

function makeContext() {
	try {
		const ctx = new AudioContext()
		activeContexts.add(ctx)
		return ctx
	} catch {
		return null
	}
}

function scheduleClose(ctx: AudioContext, delay: number) {
	const id = track(
		setTimeout(() => {
			pendingTimeouts.delete(id)
			ctx.close().catch(() => {})
			activeContexts.delete(ctx)
		}, delay)
	)
}

export function cancelAllSounds() {
	for (const id of pendingTimeouts) clearTimeout(id)
	pendingTimeouts.clear()
	for (const ctx of activeContexts) ctx.close().catch(() => {})
	activeContexts.clear()
}

function note(
	ctx: AudioContext,
	freq: number,
	startTime: number,
	duration: number,
	volume: number,
	type: OscillatorType = 'sine',
	endFreq?: number
) {
	const osc = ctx.createOscillator()
	const gain = ctx.createGain()
	osc.connect(gain)
	gain.connect(ctx.destination)
	osc.type = type
	osc.frequency.setValueAtTime(freq, startTime)
	if (endFreq !== undefined) {
		osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration)
	}
	gain.gain.setValueAtTime(volume, startTime)
	gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
	osc.start(startTime)
	osc.stop(startTime + duration)
}

export function playReviewSound(score: Score) {
	const ctx = makeContext()
	if (!ctx) return

	const t = ctx.currentTime

	if (score === 1) {
		// Again — soft descending tone, quiet like hard
		note(ctx, 290, t, 0.18, 0.15, 'sine', 140)
	} else if (score === 2) {
		// Hard — neutral short tap
		note(ctx, 400, t, 0.13, 0.15, 'triangle', 320)
	} else if (score === 3) {
		// Good — triangle like Hard but higher and held slightly longer
		note(ctx, 523, t, 0.22, 0.2, 'triangle')
	} else {
		// Easy — two notes, each quieter so the combined level stays gentle
		note(ctx, 880, t, 0.15, 0.12, 'sine')
		note(ctx, 1109, t + 0.08, 0.18, 0.11, 'sine')
	}

	scheduleClose(ctx, 600)
}

/** Play all four sounds in sequence — used as a preview in preferences. */
export function previewAllSounds() {
	cancelAllSounds()
	const scores: Score[] = [1, 2, 3, 4]
	scores.forEach((score, i) => {
		const id = track(
			setTimeout(() => {
				pendingTimeouts.delete(id)
				playReviewSound(score)
			}, i * 230)
		)
	})
}
