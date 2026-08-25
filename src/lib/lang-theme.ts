import { useSyncExternalStore, type CSSProperties } from 'react'
import { languagesCollection } from '@/features/languages/collections'
import { allLanguageOptions } from '@/lib/languages'

// Hue stops for the per-language theme, in OKLCH degrees. Spaced to hug
// both sides of the dead zones — red at the top, brand purple around 300,
// the long Duolingo green dip — and to keep enough gap between stops that a
// casual glance can tell two badges apart. Lightness and chroma come from
// Tailwind's purple ramp; only hue varies. See src/styles/theme.css.
export const LANG_HUES: ReadonlyArray<number> = [
	0, 50, 80, 110, 150, 180, 210, 240, 270, 330,
] as const

// Avatar placeholder hues: the 10° grid 0–350 with three sets of stops
// removed. First the LANG_HUES deck stops, so a missing-photo tile never
// colour-matches a language badge. Then the three dead zones LANG_HUES
// already hugs — the long Duolingo green dip (120–140), brand purple
// (290–310), and near-red (10, 350, too close to the danger hue). What's
// left is 18 saturated, well-separated hues.
export const AVATAR_HUES: ReadonlyArray<number> = [
	20, 30, 40, 60, 70, 90, 100, 160, 170, 190, 200, 220, 230, 250, 260, 280, 320,
	340,
] as const

function hashIndex(seed: string, len: number): number {
	let hash = 0
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0
	}
	return ((hash % len) + len) % len
}

// Deterministic placeholder colour for a user, keyed off a stable seed
// (their uid). A small string hash indexes into AVATAR_HUES.
export function getAvatarHue(seed: string): number {
	return AVATAR_HUES[hashIndex(seed, AVATAR_HUES.length)]
}

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

// Rotate `primary` and `accent` to one hue. Every bg-primary-*,
// text-accent-*, border-primary-* below this element follows, with no
// per-element classes and no re-declaring anything — the utilities resolve
// `--hue` on the element that carries them. The dark-mode flip composes on
// top. See src/styles/theme.css.
export function getHueCss(hue: number): CSSProperties {
	return { '--hue': hue } as CSSProperties
}

export function getLangThemeCss(lang: string): CSSProperties {
	return getHueCss(getLangHue(lang))
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
	if (!lang) el.style.removeProperty('--hue')
	else el.style.setProperty('--hue', String(getLangHue(lang)))
}
