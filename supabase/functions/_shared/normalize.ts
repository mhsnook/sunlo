// Mirror of src/features/chat/normalize.ts, vendored for Deno's edge runtime.
// Keep in sync by hand for the prototype; if this graduates, share via a
// build-time copy or a published package.

type LangRule = (input: string) => string

const generic: LangRule = (input) =>
	input
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.replace(/[¿¡!?,.;:"'`()[\]{}]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

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

const spa: LangRule = (input) => generic(input).replace(/ñ/g, 'n')

const eng: LangRule = (input) => generic(input)

const RULES: Record<string, LangRule> = { eng, spa, hin }

export function normalize(
	lang: string,
	input: string | null | undefined
): string {
	if (!input) return ''
	const rule = RULES[lang] ?? generic
	return rule(input)
}
