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

// Avatar placeholder hues: the 10° grid 0–350 with three sets of stops
// removed. First the LANG_HUES deck stops, so a missing-photo tile
// never colour-matches a language badge. Then the three dead zones
// LANG_HUES already hugs — the long Duolingo green dip (120–140),
// brand purple (290–310), and near-red (10, 350, too close to the
// danger hue). What's left is 18 saturated, well-separated hues.
export const AVATAR_HUES: ReadonlyArray<number> = [
	20, 30, 40, 60, 70, 90, 100, 160, 170, 190, 200, 220, 230, 250, 260, 280, 320,
	340,
] as const

// Deterministic placeholder hue for a user, keyed off a stable seed
// (their uid). A small string hash indexes into AVATAR_HUES.
export function getAvatarHue(seed: string): number {
	let hash = 0
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0
	}
	const len = AVATAR_HUES.length
	return AVATAR_HUES[((hash % len) + len) % len]
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

// The axis hue variables every color utility resolves through. A theme
// container re-declares them from --hue-primary so its whole subtree inherits
// the language hue for bg/text/border/gradient with no per-element hue class.
// (Setting only --hue-* is not enough: the :root axis defaults resolve
// var(--hue-primary) once, at :root, and inherit that fixed value — so a
// descendant that overrides --hue-primary is ignored unless the axis var is
// re-declared here, where the override is in scope.)
const AXIS_HUE_VARS = [
	'--bg-h',
	'--tx-h',
	'--dc-h',
	'--bd-h',
	'--bdb-h',
	'--ac-h',
	'--sh-h',
	'--gf-h',
	'--gt-h',
] as const

const AXIS_HUE_CSS = Object.fromEntries(
	AXIS_HUE_VARS.map((v) => [v, 'var(--hue-primary)'])
) as CSSProperties

// Theme a subtree with one hue. Use this rather than an inline `--hue-primary`:
// on any element below :root a bare hue override is ignored, because the axis
// vars resolved var(--hue-primary) once at :root and inherit that fixed value.
// Setting them on documentElement is the exception — there they recompute.
export function getHueThemeCss(hue: number): CSSProperties {
	return {
		'--hue-primary': hue,
		'--hue-accent': hue,
		'--hue-neutral': hue,
		...AXIS_HUE_CSS,
	} as CSSProperties
}

export function getLangThemeCss(lang: string): CSSProperties {
	return getHueThemeCss(getLangHue(lang))
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
		for (const v of AXIS_HUE_VARS) el.style.removeProperty(v)
		return
	}
	const hue = String(getLangHue(lang))
	el.style.setProperty('--hue-primary', hue)
	el.style.setProperty('--hue-accent', hue)
	el.style.setProperty('--hue-neutral', hue)
	for (const v of AXIS_HUE_VARS) el.style.setProperty(v, 'var(--hue-primary)')
}
