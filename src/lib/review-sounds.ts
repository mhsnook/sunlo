/**
 * Synthesized feedback sounds for review scoring.
 * Uses Web Audio API — no external files, works offline.
 * Triggered by user gesture (button click) so no autoplay issues.
 */

type ReviewScore = 1 | 2 | 3 | 4

function makeContext() {
	try {
		return new AudioContext()
	} catch {
		return null
	}
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

export function playReviewSound(score: ReviewScore) {
	const ctx = makeContext()
	if (!ctx) return

	const t = ctx.currentTime

	if (score === 1) {
		// Again — descending "bloop", soft disappointment
		note(ctx, 290, t, 0.18, 0.28, 'sine', 140)
	} else if (score === 2) {
		// Hard — neutral short tap, medium pitch
		note(ctx, 400, t, 0.13, 0.2, 'triangle', 320)
	} else if (score === 3) {
		// Good — clean ding, C5
		note(ctx, 523, t, 0.22, 0.22, 'sine')
	} else {
		// Easy — bright coin: two quick ascending notes
		note(ctx, 880, t, 0.15, 0.22, 'sine')
		note(ctx, 1109, t + 0.08, 0.18, 0.2, 'sine')
	}

	setTimeout(() => ctx.close(), 600)
}
