import type { CSSProperties } from 'react'

const noDeckTheme = {
	name: 'purple',
	hue: 260,
	hueOff: 220,
	hueAccent: 160,
}

export type ThemeType = typeof noDeckTheme

const themes: ThemeType[] = [
	{ name: 'pink', hue: 310, hueOff: 270, hueAccent: 210 },
	{ name: 'red', hue: 0, hueOff: 320, hueAccent: 290 },
	{ name: 'gold', hue: 50, hueOff: 30, hueAccent: 320 },
	{ name: 'green', hue: 160, hueOff: 140, hueAccent: 220 },
	{ name: 'blue', hue: 210, hueOff: 190, hueAccent: 40 },
]

function setTheme(theEl?: HTMLElement, theme?: ThemeType) {
	const toSet = theme ?? noDeckTheme
	const el = theEl ?? document.documentElement

	el.style.setProperty('--hue', String(toSet.hue))
	el.style.setProperty('--hue-off', String(toSet.hueOff))
	el.style.setProperty('--hue-accent', String(toSet.hueAccent))
}

export type ThemeCSS = CSSProperties

export { themes, setTheme }
