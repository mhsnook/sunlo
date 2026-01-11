import type { CSSProperties } from 'react'

const noDeckTheme = {
	name: 'purple',
	hue: 260,
	hueOff: 220,
	hueAccent: 160,
}

export type ThemeType = typeof noDeckTheme

export const themes: ThemeType[] = [
	{ name: 'cyan', hue: 205, hueOff: 225, hueAccent: 205 },
	{ name: 'ocean', hue: 230, hueOff: 210, hueAccent: 230 },
	// 255 is adjacent to true purple
	// 275 is our true purple
	{ name: 'hotpink', hue: 300, hueOff: 320, hueAccent: 300 },
	{ name: 'blush', hue: 325, hueOff: 305, hueAccent: 325 },
	// 335 is adjacent to our true red, 355 is true red, 015 is adjacent
	// this one just looks bad in dark mode bc the bg colour is bluish
	// { name: 'brick', hue: 30, hueOff: 50, hueAccent: 30 },
	{ name: 'sand', hue: 55, hueOff: 35, hueAccent: 55 },
	// 75 looks sick, 95 and 115 look like owl
	// 135 is adjacent to true green
	// 155 is our true green,
	// 175 would seem too close, but human eyes are good at green
	{ name: 'teal', hue: 180, hueOff: 200, hueAccent: 180 },
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
