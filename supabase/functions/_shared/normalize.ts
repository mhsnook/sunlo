// Mirror of src/features/chat/normalize.ts, vendored for Deno's edge runtime.
// Keep in sync by hand for the prototype.
//
// PHILOSOPHY: language-agnostic, unconditional only. Anything specific to a
// language belongs in suggestions.ts where humans can review.

type LangRule = (input: string) => string

const generic: LangRule = (input) =>
	input
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.replace(/[¿¡!?,.;:"'`()[\]{}]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

const spa: LangRule = (input) => generic(input).replace(/ñ/g, 'n')

const RULES: Record<string, LangRule> = { spa }

export function normalize(
	lang: string,
	input: string | null | undefined
): string {
	if (!input) return ''
	const rule = RULES[lang] ?? generic
	return rule(input)
}
