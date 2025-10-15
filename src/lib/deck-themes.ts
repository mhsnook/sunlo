import type { CSSProperties } from 'react'

const noDeckTheme = {
	name: 'purple',
	hue: 260,
	hueOff: 220,
	hueAccent: 160,
}

type ThemeType = typeof noDeckTheme

const themes: Record<string, ThemeType> = {
	pink: { name: 'pink', hue: 310, hueOff: 270, hueAccent: 210 },
	red: { name: 'red', hue: 0, hueOff: 320, hueAccent: 290 },
	gold: { name: 'gold', hue: 50, hueOff: 30, hueAccent: 320 },
	green: { name: 'green', hue: 160, hueOff: 140, hueAccent: 220 },
	blue: { name: 'blue', hue: 210, hueOff: 190, hueAccent: 40 },
}

export const themeNames = Object.keys(themes)

export type ThemeNamesEnum = (typeof themeNames)[number]

export const themeCss = (name: ThemeNamesEnum) =>
	({
		'--hue': themes[name].hue,
		'--hue-off': themes[name].hueOff,
		'--hue-accent': themes[name].hueAccent,
	}) as CSSProperties

export function setTheme(theEl?: HTMLElement, name?: ThemeNamesEnum): void {
	const toSet = name ? themes[name] : noDeckTheme
	const el = theEl ?? document.documentElement

	el.style.setProperty('--hue', String(toSet.hue))
	el.style.setProperty('--hue-off', String(toSet.hueOff))
	el.style.setProperty('--hue-accent', String(toSet.hueAccent))
}

export type ThemeCSS = CSSProperties
