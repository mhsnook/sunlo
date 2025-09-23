export type ThemeType = {
	name: string
	hue: number
	hueOff: number
	hueAccent: number
}

const themes: ThemeType[] = [
	//	{ name: 'purple', hue: 260, hueOff: 220, hueAccent: 160 },
	{ name: 'pink', hue: 310, hueOff: 270, hueAccent: 210 },
	{ name: 'red', hue: 0, hueOff: 320, hueAccent: 290 },
	{ name: 'gold', hue: 50, hueOff: 30, hueAccent: 320 },
	{ name: 'green', hue: 160, hueOff: 140, hueAccent: 220 },
	{ name: 'blue', hue: 210, hueOff: 190, hueAccent: 40 },
]

export { themes }
