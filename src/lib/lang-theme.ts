import { useSyncExternalStore, type CSSProperties } from 'react'
import { languagesCollection } from '@/features/languages/collections'
import { allLanguageOptions } from '@/lib/languages'

// Hand-picked OKLCH hue stops. Spaced to hug both sides of the dead
// zones — red at the top, brand purple around 300, the long Duolingo
// green dip — and to keep enough gap between stops that a casual
// glance can tell two badges apart. Chroma + luminance are pinned by
// the LangBadge variant; only hue varies.
export const LANG_HUES: ReadonlyArray<number> = [
	0, 50, 80, 110, 150, 180, 210, 240, 270, 330,
] as const

// Permutation walked over the popularity-ranked language list. The
// most popular language (display_order 1) gets stop 6 (sky blue), the
// next stop 0 (red), and so on. Adjacent ranks always land far apart
// on the wheel, so the dashboard reads as colourful regardless of
// which languages a learner picks.
const LANG_STOP_WALK: ReadonlyArray<number> = [
	6, 0, 4, 8, 2, 7, 1, 5, 9, 3,
] as const

let cachedRanking = new Map<string, number>()
let cachedRankingSize = -1

function getPopularityRanking(): Map<string, number> {
	const arr = languagesCollection.toArray
	if (arr.length === cachedRankingSize) return cachedRanking
	const sorted = arr
		.filter((l) => l.display_order != null)
		.toSorted((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
	cachedRanking = new Map(sorted.map((l, i) => [l.lang, i]))
	cachedRankingSize = arr.length
	return cachedRanking
}

function alphabeticFallbackIndex(lang: string): number {
	const i = allLanguageOptions.findIndex((o) => o.value === lang)
	return i < 0 ? 0 : i
}

export function getLangPopularityIndex(lang: string): number {
	const ranking = getPopularityRanking()
	return ranking.get(lang) ?? alphabeticFallbackIndex(lang)
}

export function getLangHueIndex(lang: string): number {
	const pos = getLangPopularityIndex(lang)
	return LANG_STOP_WALK[pos % LANG_STOP_WALK.length]
}

export function getLangHue(lang: string): number {
	return LANG_HUES[getLangHueIndex(lang)]
}

// One-shot readiness flag for the popularity ranking. Flips false → true
// when languagesCollection first reports ready, then never moves; the
// listener set is cleared after firing. Consumers subscribe via the
// hook below to get a visible "hydration" transition: badges paint
// neutral grey on first paint, then fade to their language hue once
// the ranking is in.
let popularityReady = languagesCollection.isReady()
const readyListeners = new Set<() => void>()

if (!popularityReady) {
	languagesCollection.onFirstReady(() => {
		popularityReady = true
		for (const fn of readyListeners) fn()
		readyListeners.clear()
	})
}

function subscribeReady(callback: () => void): () => void {
	if (popularityReady) return () => {}
	readyListeners.add(callback)
	return () => {
		readyListeners.delete(callback)
	}
}

export function useLangPopularityReady(): boolean {
	return useSyncExternalStore(
		subscribeReady,
		() => popularityReady,
		() => false
	)
}

export function getLangThemeCss(lang: string): CSSProperties {
	const hue = getLangHue(lang)
	return {
		'--hue-primary': hue,
		'--hue-accent': hue,
		'--hue-neutral': hue,
	} as CSSProperties
}

// Hook variant of getLangThemeCss that returns an empty style object
// until the popularity ranking has loaded. Keeps the deck-tile chrome
// matched to the LangBadge: both stay neutral on first paint and pick
// up their language hue together.
export function useLangThemeCss(lang: string): CSSProperties {
	const ready = useLangPopularityReady()
	return ready ? getLangThemeCss(lang) : {}
}

export function setLangTheme(element?: HTMLElement, lang?: string): void {
	const el = element ?? document.documentElement
	if (!lang) {
		el.style.removeProperty('--hue-primary')
		el.style.removeProperty('--hue-accent')
		el.style.removeProperty('--hue-neutral')
		return
	}
	const hue = String(getLangHue(lang))
	el.style.setProperty('--hue-primary', hue)
	el.style.setProperty('--hue-accent', hue)
	el.style.setProperty('--hue-neutral', hue)
}
