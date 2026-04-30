// Per-language suggestion rules. Surface as one-by-one suggestions in the UI:
// the user accepts or dismisses each. Advisory, not silent transforms.
//
// Rules can be character-level (e.g. /chch/g) or word-level (e.g. /\bhu\b/g).
// The algorithm tokenizes the query on whitespace, applies each rule to each
// word, and emits a suggestion whenever a word changes — showing the WHOLE
// affected word in the display ("achcha → accha"), not just the matched
// fragment ("chch → cch"). Accepting replaces all instances of that word
// (boundary-safe) with the corrected form in the query.

type Rule = { pattern: RegExp; to: string }

const HIN: Rule[] = [
	// Character-level: aspirated-consonant geminate digraphs. The doubled-stop
	// form (cch, kkh, …) is canonical; the doubled-digraph form (chch, khkh, …)
	// is non-standard.
	{ pattern: /chch/g, to: 'cch' },
	{ pattern: /khkh/g, to: 'kkh' },
	{ pattern: /ghgh/g, to: 'ggh' },
	{ pattern: /thth/g, to: 'tth' },
	{ pattern: /dhdh/g, to: 'ddh' },
	{ pattern: /phph/g, to: 'pph' },
	{ pattern: /bhbh/g, to: 'bbh' },

	// Word-level: short forms / common alternates that have a more standard
	// canonical romanization. Add only when both sides are clearly the same
	// word — never when they could be different words (e.g. hai vs hain).
	{ pattern: /\bhu\b/g, to: 'hoon' },
	{ pattern: /\bacha\b/g, to: 'accha' },
	{ pattern: /\bachche\b/g, to: 'acche' },
	{ pattern: /\brahee\b/g, to: 'rahi' },
	{ pattern: /\brahaa\b/g, to: 'raha' },
]

const RULES_BY_LANG: Record<string, Rule[]> = {
	hin: HIN,
}

export type Suggestion = {
	key: string // stable id for dismissal tracking ("achcha->accha")
	fromMatch: string // the whole word as the user typed it
	to: string // the corrected whole word
	applied: string // what the query becomes if accepted
}

const REGEX_META = /[.*+?^${}()|[\]\\]/g
const escape = (s: string): string => s.replace(REGEX_META, '\\$&')

export function suggestForQuery(lang: string, query: string): Suggestion[] {
	const rules = RULES_BY_LANG[lang]
	if (!rules || !query) return []

	const words = query.match(/\S+/g) ?? []
	const seen = new Set<string>()
	const out: Suggestion[] = []

	for (const word of words) {
		for (const rule of rules) {
			const newWord = word.replace(rule.pattern, rule.to)
			if (newWord === word) continue

			const key = `${word}->${newWord}`
			if (seen.has(key)) continue
			seen.add(key)

			// Replace every standalone occurrence of `word` in the query.
			const applied = query.replace(
				new RegExp(`\\b${escape(word)}\\b`, 'g'),
				newWord
			)

			out.push({ key, fromMatch: word, to: newWord, applied })
		}
	}
	return out
}
