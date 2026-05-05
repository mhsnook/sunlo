// Pure-TS normalization, shared between the client (for the search query),
// the Edge Function (for the same query, server-side), and the backfill
// script (for indexed content). Same input → same output, always.
//
// PHILOSOPHY: this layer is unconditional and language-agnostic enough to be
// safe. Anything language-specific that could plausibly be wrong, debated,
// or regional belongs in suggestions.ts (where the user sees and approves
// the change), NOT here. Lean on BGE-M3 for cross-spelling matching.

type LangRule = (input: string) => string

const generic: LangRule = (input) =>
	input
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}+/gu, '') // strip combining marks (accents)
		.replace(/[¿¡!?,.;:"'`()[\]{}]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

// Spanish: belt-and-braces ñ → n in case a precomposed form survives NFD.
const spa: LangRule = (input) => generic(input).replace(/ñ/g, 'n')

const RULES: Record<string, LangRule> = {
	spa,
}

export function normalize(
	lang: string,
	input: string | null | undefined
): string {
	if (!input) return ''
	const rule = RULES[lang] ?? generic
	return rule(input)
}
