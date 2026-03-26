import allLanguages from '@/lib/languages'

// --- Types ---

export interface SearchFilter {
	type: 'lang' | 'tag'
	value: string
	label: string
}

export interface ParsedSearch {
	suggestions: Array<SearchFilter>
	effectiveText: string
}

// --- Constants ---

const PREPOSITIONS = new Set(['in', 'for', 'about', 'the', 'a'])

// --- Main function ---

/**
 * Parse input text to:
 * 1. Detect language/tag names and offer them as clickable filter suggestions
 * 2. Strip words matching active LANGUAGE filter labels from the search text
 *    so results stay consistent before and after clicking a language filter
 *
 * Only language filters cause word stripping — tag filter labels are never
 * stripped because tags often overlap with real search content
 * (e.g. "hot dog" is both a tag and something you'd search for).
 */
export function parseSearchInput(
	text: string,
	existingFilters: Array<SearchFilter>,
	availableTagNames: Array<string>
): ParsedSearch {
	const trimmed = text.trim()
	if (!trimmed) {
		return { suggestions: [], effectiveText: '' }
	}

	const words = trimmed
		.toLowerCase()
		.split(/[\s,.!?;:'"()[\]{}]+/)
		.filter(Boolean)
	const suggestions: Array<SearchFilter> = []
	const wordsToStrip = new Set<string>()

	const existingLangs = new Set(
		existingFilters.filter((f) => f.type === 'lang').map((f) => f.value)
	)
	const existingTags = new Set(
		existingFilters.filter((f) => f.type === 'tag').map((f) => f.value)
	)

	// Strip words that match active LANGUAGE filter labels only
	for (const filter of existingFilters) {
		if (filter.type !== 'lang') continue
		const labelWords = filter.label.toLowerCase().split(/\s+/)
		for (const labelWord of labelWords) {
			for (const word of words) {
				if (
					word.length >= 3 &&
					(labelWord.startsWith(word) || labelWord === word)
				) {
					wordsToStrip.add(word)
				}
			}
		}
	}

	// Detect language names in text -> suggest (not auto-applied)
	for (const [code, name] of Object.entries(allLanguages)) {
		if (existingLangs.has(code)) continue
		const nameLower = name.toLowerCase()
		const matched = words.find(
			(w) =>
				w.length >= 3 &&
				!wordsToStrip.has(w) &&
				(nameLower.startsWith(w) || nameLower === w)
		)
		if (matched) {
			suggestions.push({ type: 'lang', value: code, label: name })
			break // only suggest one language
		}
	}

	// Detect tag names in text -> suggest (not auto-applied)
	for (const tagName of availableTagNames) {
		if (existingTags.has(tagName)) continue
		const tagLower = tagName.toLowerCase()
		const matched = words.find(
			(w) => w.length >= 3 && !wordsToStrip.has(w) && tagLower.startsWith(w)
		)
		if (matched) {
			suggestions.push({ type: 'tag', value: tagName, label: tagName })
		}
	}

	// Build effective text: strip only language filter words + orphaned prepositions
	const hasStrips = wordsToStrip.size > 0
	const effectiveText = words
		.filter((w) => !wordsToStrip.has(w) && !(hasStrips && PREPOSITIONS.has(w)))
		.join(' ')
		.trim()

	return {
		suggestions: suggestions.slice(0, 3),
		effectiveText,
	}
}
