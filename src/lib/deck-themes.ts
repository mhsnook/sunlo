import type { CSSProperties } from 'react'

const noDeckTheme = {
	name: 'purple',
	hue: 260,
	hueOff: 220,
	hueAccent: 160,
}

export type ThemeType = typeof noDeckTheme

export const themes: ThemeType[] = [
	{ name: 'pink', hue: 310, hueOff: 270, hueAccent: 210 },
	{ name: 'red', hue: 0, hueOff: 320, hueAccent: 290 },
	{ name: 'gold', hue: 50, hueOff: 30, hueAccent: 320 },
	{ name: 'green', hue: 160, hueOff: 140, hueAccent: 220 },
	{ name: 'blue', hue: 210, hueOff: 190, hueAccent: 40 },
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
