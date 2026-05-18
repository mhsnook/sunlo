/**
 * Dev-only: extends tailwind-merge to understand the `tailwind-oklch` plugin
 * and our local `rounded-squircle` utility. Bundled into the dev-only chunk
 * so it never reaches production.
 *
 * The oklch plugin generates utilities that compose across three axes
 * (luminance contrast, chroma, hue). Stock tailwind-merge groups them all
 * under e.g. `bg-color` and would falsely flag `text-c-lo text-lc-6` as a
 * conflict. We define one group per axis so cross-axis combinations compose,
 * but two utilities targeting the same axis still flag.
 */

import { extendTailwindMerge, type ClassValidator } from 'tailwind-merge'

const HUES = [
	'primary',
	'accent',
	'neutral',
	'success',
	'warning',
	'danger',
	'info',
] as const

const CHROMAS = ['lo', 'mlo', 'mid', 'mhi', 'hi'] as const
const CHROMA_NUMS = new Set(['10', '20', '30', '40', '50', '60', '70', '80', '90', '95'])

const LC_NAMED = ['base', 'fore', 'none', 'full'] as const
const LC_NUMS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

const isHue: ClassValidator = (s) => (HUES as readonly string[]).includes(s)
const isChroma: ClassValidator = (s) =>
	(CHROMAS as readonly string[]).includes(s) || CHROMA_NUMS.has(s)
const isLc: ClassValidator = (s) =>
	(LC_NAMED as readonly string[]).includes(s) || LC_NUMS.includes(s)

// Two-axis shorthand "{L}-{C}", e.g. `bg-3-mhi`
const isTwoAxis: ClassValidator = (s) => {
	const parts = s.split('-')
	return parts.length === 2 && isLc(parts[0]) && isChroma(parts[1])
}

// Three-axis shorthand "{L}-{C}-{H}", e.g. `bg-1-mlo-primary`
const isThreeAxis: ClassValidator = (s) => {
	const parts = s.split('-')
	return (
		parts.length === 3 &&
		isLc(parts[0]) &&
		isChroma(parts[1]) &&
		isHue(parts[2])
	)
}

// Properties that the oklch plugin generates decomposed utilities for.
// `border-b` is also supported but most call sites use `border-*` so we lead
// with that.
const COLOR_PROPS = [
	'bg',
	'text',
	'border',
	'border-b',
	'accent',
	'from',
	'to',
	'shadow',
] as const

type GroupId = string

const classGroups: Record<GroupId, Array<unknown>> = {}

for (const p of COLOR_PROPS) {
	classGroups[`${p}-oklch-lc`] = [
		{ [`${p}-lc`]: [isLc] },
		{ [`${p}-lc-up`]: [(s: string) => /^[1-5]$/.test(s)] },
		{ [`${p}-lc-down`]: [(s: string) => /^[1-5]$/.test(s)] },
	]
	classGroups[`${p}-oklch-c`] = [{ [`${p}-c`]: [isChroma] }]
	classGroups[`${p}-oklch-h`] = [{ [`${p}-h`]: [isHue] }]
	classGroups[`${p}-oklch-shorthand`] = [{ [p]: [isTwoAxis, isThreeAxis] }]
}

// Global hue/chroma utilities — set CSS vars that every property reads.
classGroups['oklch-hue-global'] = [{ hue: [isHue] }]
classGroups['oklch-chroma-global'] = [{ chroma: [isChroma] }]

// NOTE: we intentionally do NOT declare cross-group conflicts (e.g. shorthand
// vs axis, or oklch vs stock `bg-color`). The implicit same-group rule —
// two `bg-h-*` values, two shorthands, two stock `bg-color`s — covers the
// real bugs, and broad cross-conflicts produce false positives in the
// "compose by stacking" pattern the oklch plugin is designed around.

export const twMergeConfig = {
	extend: {
		classGroups: {
			...classGroups,
			// `rounded-squircle` lives in our own globals.css and uses !important
			// on border-radius, so in practice it always wins. Adding it to the
			// rounded group makes twMerge collapse `rounded-xl rounded-squircle`
			// down to just `rounded-squircle`.
			rounded: ['rounded-squircle'],
		},
	},
} as const

let cachedFn: ((input: string) => string) | undefined
export function getOklchTwMerge() {
	if (!cachedFn) cachedFn = extendTailwindMerge(twMergeConfig)
	return cachedFn
}
