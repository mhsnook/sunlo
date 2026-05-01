// Per-language suggestion rules. Surface as one-by-one suggestions in the UI:
// the user accepts or dismisses each. Advisory, not silent transforms.
//
// Rules are defined in JSON files at src/features/chat/rules/<lang>.json so
// they can be edited without touching code. Each rule has:
//   match   — literal substring or word to look for (regex chars are escaped)
//   to      — what to replace it with
//   scope   — "anywhere" matches the substring inside any word; "word"
//             matches only when surrounded by word boundaries
//   note    — optional human-readable explanation
//
// The algorithm tokenizes the query on whitespace, applies each compiled
// rule to each word, and emits a suggestion whenever a word changes —
// showing the WHOLE affected word in the display ("achcha → accha"), not
// just the matched fragment ("chch → cch"). Accepting replaces all
// instances of that word (boundary-safe) with the corrected form.

import hinRules from './rules/hin.json'
import spaRules from './rules/spa.json'

type RawRule = {
	match: string
	to: string
	scope: 'anywhere' | 'word'
	note?: string
}

type Rule = { pattern: RegExp; to: string }

const REGEX_META = /[.*+?^${}()|[\]\\]/g
const escape = (s: string): string => s.replace(REGEX_META, '\\$&')

function compileRule(raw: RawRule): Rule {
	const escaped = escape(raw.match)
	const pattern =
		raw.scope === 'word'
			? new RegExp(`\\b${escaped}\\b`, 'g')
			: new RegExp(escaped, 'g')
	return { pattern, to: raw.to }
}

function compileRuleSet(raw: { rules: unknown[] }): Rule[] {
	return raw.rules.map((r) => compileRule(r as RawRule))
}

const RULES_BY_LANG: Record<string, Rule[]> = {
	hin: compileRuleSet(hinRules),
	spa: compileRuleSet(spaRules),
}

export type Suggestion = {
	key: string // stable id for dismissal tracking ("achcha->accha")
	fromMatch: string // the whole word as the user typed it
	to: string // the corrected whole word
	applied: string // what the query becomes if accepted
}

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
