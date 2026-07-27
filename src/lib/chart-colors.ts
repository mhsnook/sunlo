// Chart series colours. Luminance and chroma come from the ramp so they
// auto-flip; only the hue is pinned.
//
// Deliberately not --hue-primary/--hue-accent: per-language theming overrides
// both, and sets them to the same value, so two series keyed to them would
// render identically inside a themed deck.
const series = (hue: string) => `oklch(var(--lum-5) var(--chroma-max) ${hue})`

export const CHART_SERIES_A = series('var(--hue-info)') // blue
export const CHART_SERIES_B = series('var(--hue-success)') // green

export const SCATTER_COLORS = [
	series('var(--hue-info)'),
	series('var(--hue-success)'),
	series('var(--hue-warning)'),
	series('var(--hue-danger)'),
	series('280'),
]

/** Axis labels, gridlines, tick text. */
export const CHART_INK =
	'oklch(var(--lum-7) var(--chroma-low) var(--hue-neutral))'

/** The page colour, for stroking segments apart. */
export const CHART_PAGE =
	'oklch(var(--lum-1) var(--chroma-low) var(--hue-neutral))'
