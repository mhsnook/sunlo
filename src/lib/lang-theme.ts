import { useSyncExternalStore, type CSSProperties } from 'react'
import { languagesCollection } from '@/features/languages/collections'
import { allLanguageOptions } from '@/lib/languages'

// Stock Tailwind palettes, one per language stop. Spread around the wheel
// so a casual glance tells two badges apart, and skipping purple, which is
// the app's own primary. A language theme re-points `primary` and `accent`
// at one of these — see getLangThemeCss below and src/styles/theme.css.
export const LANG_PALETTES: ReadonlyArray<string> = [
	'rose',
	'orange',
	'yellow',
	'lime',
	'emerald',
	'teal',
	'cyan',
	'blue',
	'indigo',
	'fuchsia',
] as const

// Avatar placeholder palettes: every chromatic Tailwind palette, so a
// missing-photo tile has 17 well-separated colours to land on. Unlike the
// old hue grid these overlap LANG_PALETTES, so an avatar can now colour-match
// a language badge. Narrow this list if that reads as confusing.
export const AVATAR_PALETTES: ReadonlyArray<string> = [
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose',
] as const

function hashIndex(seed: string, len: number): number {
	let hash = 0
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0
	}
	return ((hash % len) + len) % len
}

// Deterministic placeholder colour for a user, keyed off a stable seed
// (their uid). The avatar fallback only paints one surface, so it re-points
// a single shade instead of the whole palette.
export function getAvatarPaletteCss(seed: string): CSSProperties {
	const palette = AVATAR_PALETTES[hashIndex(seed, AVATAR_PALETTES.length)]
	return { '--p-500': `var(--color-${palette}-500)` } as CSSProperties
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

export function getLangPaletteIndex(lang: string): number {
	const pos = getLangPopularityIndex(lang)
	return LANG_STOP_WALK[pos % LANG_STOP_WALK.length]
}

export function getLangPalette(lang: string): string {
	return LANG_PALETTES[getLangPaletteIndex(lang)]
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

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

// Re-point `primary` and `accent` at a stock Tailwind palette. Every
// bg-primary-*, text-accent-*, border-primary-* below this element resolves
// through these, so a whole subtree re-themes with no per-element classes.
// The dark-mode flip composes on top: it is written against --p-*/--a-*, so
// a re-pointed palette still flips. See src/styles/theme.css.
export function getPaletteCss(palette: string): CSSProperties {
	return Object.fromEntries(
		SHADES.flatMap((s) => [
			[`--p-${s}`, `var(--color-${palette}-${s})`],
			[`--a-${s}`, `var(--color-${palette}-${s})`],
		])
	) as CSSProperties
}

export function setPaletteOn(el: HTMLElement, palette: string | null): void {
	for (const s of SHADES) {
		if (palette === null) {
			el.style.removeProperty(`--p-${s}`)
			el.style.removeProperty(`--a-${s}`)
		} else {
			el.style.setProperty(`--p-${s}`, `var(--color-${palette}-${s})`)
			el.style.setProperty(`--a-${s}`, `var(--color-${palette}-${s})`)
		}
	}
}

export function getLangThemeCss(lang: string): CSSProperties {
	return getPaletteCss(getLangPalette(lang))
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
	setPaletteOn(el, lang ? getLangPalette(lang) : null)
}
