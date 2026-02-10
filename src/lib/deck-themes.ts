import type { CSSProperties } from 'react'

// All hue values are OKLCH hue angles (0-360)
const noDeckTheme = {
	name: 'purple',
	hue: 300,
	hueOff: 270,
	hueAccent: 175,
}

export type ThemeType = typeof noDeckTheme

export const themes: ThemeType[] = [
	{ name: 'cyan', hue: 230, hueOff: 250, hueAccent: 230 },
	{ name: 'ocean', hue: 260, hueOff: 245, hueAccent: 260 },
	// OKLCH ~300 is our true purple
	{ name: 'hotpink', hue: 335, hueOff: 350, hueAccent: 335 },
	{ name: 'blush', hue: 355, hueOff: 340, hueAccent: 355 },
	// OKLCH ~25 is red, ~55 is orange, ~85-100 is yellow
	// ~140 is green, ~175 is teal, ~195 is cyan
	{ name: 'teal', hue: 195, hueOff: 215, hueAccent: 195 },
]

export const getThemeCss = (index?: number) => {
	const theme = typeof index === 'number' ? themes[index] : noDeckTheme
	return {
		'--h': theme?.hue,
		'--h-off': theme?.hueOff,
		'--h-accent': theme?.hueAccent,
	} as CSSProperties
}

export function setTheme(element?: HTMLElement, index?: number) {
	const theme = typeof index === 'number' ? themes[index] : noDeckTheme
	const el = element ?? document.documentElement

	el.style.setProperty('--h', String(theme.hue))
	el.style.setProperty('--h-off', String(theme.hueOff))
	el.style.setProperty('--h-accent', String(theme.hueAccent))
}

export type ThemeCSS = CSSProperties
