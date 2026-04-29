// Pure-TS normalization, shared between the client (for the search query),
// the Edge Function (for the same query, server-side), and the backfill
// script (for indexed content). Same input → same output, always.
//
// Prototype rules: lowercase, strip combining diacritics, collapse whitespace,
// remove most punctuation, then per-language fixups for common ortho swaps.
// Not exhaustive — designed to land BGE-M3 inputs in the same shape rather
// than to canonicalize against a real style guide.

type LangRule = (input: string) => string

const generic: LangRule = (input) =>
	input
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}+/gu, '') // strip combining marks (accents)
		.replace(/[¿¡!?,.;:"'`()[\]{}]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

// Hindi (Roman-script transliteration). Common spelling variants we collapse:
//   achche / acche, hein / hain, hai / hei, kar / kr.
// Generic must run first so we work on lowercase ASCII.
const hin: LangRule = (input) => {
	let s = generic(input)
	s = s.replace(/\bachche\b/g, 'acche')
	s = s.replace(/\bhein\b/g, 'hain')
	s = s.replace(/\bhei\b/g, 'hai')
	s = s.replace(/\bhoon\b/g, 'hun')
	s = s.replace(/\bjaa\b/g, 'ja')
	s = s.replace(/\braha\b/g, 'rha')
	s = s.replace(/\brahaa\b/g, 'rha')
	s = s.replace(/\brahi\b/g, 'rhi')
	s = s.replace(/\brahee\b/g, 'rhi')
	return s
}

// Spanish: generic already strips accents. Add ñ → n explicitly since NFD
// decomposes ñ to n + combining tilde, which the diacritic strip removes —
// but be explicit in case a precomposed form survives.
const spa: LangRule = (input) => generic(input).replace(/ñ/g, 'n')

// English: generic is enough.
const eng: LangRule = (input) => generic(input)

const RULES: Record<string, LangRule> = {
	eng,
	spa,
	hin,
}

export function normalize(
	lang: string,
	input: string | null | undefined
): string {
	if (!input) return ''
	const rule = RULES[lang] ?? generic
	return rule(input)
}
