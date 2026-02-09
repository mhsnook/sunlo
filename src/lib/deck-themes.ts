import type { CSSProperties } from 'react'

// Hue values are OKLCH hues (perceptually uniform, 0-360)
// OKLCH hue reference: 0=red, 30=orange, 90=yellow, 150=green,
// 185=teal, 210=cyan, 240=blue, 270=purple, 325=pink, 355=magenta
const noDeckTheme = {
	name: 'purple',
	hue: 265,
	hueOff: 245,
	hueAccent: 152,
}

export type ThemeType = typeof noDeckTheme

export const themes: ThemeType[] = [
	{ name: 'cyan', hue: 210, hueOff: 230, hueAccent: 210 },
	{ name: 'ocean', hue: 245, hueOff: 225, hueAccent: 245 },
	// 265 is adjacent to true purple (270)
	{ name: 'hotpink', hue: 325, hueOff: 345, hueAccent: 325 },
	{ name: 'blush', hue: 355, hueOff: 335, hueAccent: 355 },
	// 15 is true red, 30 is orange
	// brick/sand could work better with oklch perceptual uniformity
	// { name: 'brick', hue: 40, hueOff: 60, hueAccent: 40 },
	// { name: 'sand', hue: 70, hueOff: 50, hueAccent: 70 },
	// 120 is yellow-green, 150 is our true green
	// 175 is green-teal
	{ name: 'teal', hue: 185, hueOff: 210, hueAccent: 185 },
]

export const getThemeCss = (index?: number) => {
	const theme = typeof index === 'number' ? themes[index] : noDeckTheme
	return {
		'--hue': theme?.hue,
		'--hue-off': theme?.hueOff,
		'--hue-accent': theme?.hueAccent,
	} as CSSProperties
}

export function setTheme(element?: HTMLElement, index?: number) {
	const theme = typeof index === 'number' ? themes[index] : noDeckTheme
	const el = element ?? document.documentElement

	el.style.setProperty('--hue', String(theme.hue))
	el.style.setProperty('--hue-off', String(theme.hueOff))
	el.style.setProperty('--hue-accent', String(theme.hueAccent))
}

export type ThemeCSS = CSSProperties
