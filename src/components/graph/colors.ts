/**
 * A palette of 16 distinct colors for cluster visualization.
 * These use oklch for perceptual uniformity across light/dark themes.
 */
export const CLUSTER_COLORS = [
	'oklch(0.65 0.2 330)', // pink
	'oklch(0.65 0.2 260)', // blue
	'oklch(0.7 0.18 145)', // green
	'oklch(0.7 0.18 60)', // orange
	'oklch(0.6 0.22 290)', // purple
	'oklch(0.7 0.16 190)', // teal
	'oklch(0.7 0.2 25)', // red-orange
	'oklch(0.7 0.15 100)', // yellow-green
	'oklch(0.6 0.18 310)', // magenta
	'oklch(0.65 0.18 220)', // cyan-blue
	'oklch(0.7 0.2 40)', // warm orange
	'oklch(0.65 0.2 170)', // seafoam
	'oklch(0.6 0.2 350)', // rose
	'oklch(0.7 0.15 75)', // gold
	'oklch(0.6 0.18 240)', // slate blue
	'oklch(0.7 0.18 120)', // lime
] as const
