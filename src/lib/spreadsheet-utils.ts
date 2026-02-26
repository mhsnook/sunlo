import languages from '@/lib/languages'

export type ColumnRole = 'phrase' | 'translation' | 'tags' | 'skip'

export type ColumnMapping = {
	role: ColumnRole
	lang: string
}

export type SpreadsheetPhrase = {
	phrase_text: string
	translations: Array<{ lang: string; text: string }>
	tags: Array<string>
}

export function parseTsv(text: string): {
	headers: Array<string>
	rows: Array<Array<string>>
} {
	const lines = text.trim().split('\n')
	if (lines.length < 2) return { headers: [], rows: [] }

	// Auto-detect delimiter: prefer tab, fall back to comma
	const delimiter = lines[0].includes('\t') ? '\t' : ','
	const headers = lines[0].split(delimiter).map((h) => h.trim())
	const rows = lines
		.slice(1)
		.map((line) => line.split(delimiter).map((cell) => cell.trim()))
		.filter((row) => row.some((cell) => cell.length > 0))

	return { headers, rows }
}

export function detectColumnMapping(
	header: string,
	routeLang: string
): ColumnMapping {
	const lower = header.toLowerCase().trim()

	// Extract parenthetical content like "phrase (kan)" or "translation (English)"
	const parenMatch = header.match(/\((\w+)\)/)
	const parenContent = parenMatch?.[1]?.toLowerCase()

	// Try to detect language from parenthetical
	let detectedLang = ''
	if (parenContent) {
		if (parenContent.length === 3 && languages[parenContent]) {
			detectedLang = parenContent
		} else {
			const entry = Object.entries(languages).find(
				([, name]) => name.toLowerCase() === parenContent
			)
			if (entry) detectedLang = entry[0]
		}
	}

	// Detect role from keywords
	if (/tag/i.test(lower)) return { role: 'tags', lang: '' }
	if (/phrase/i.test(lower))
		return { role: 'phrase', lang: detectedLang || routeLang }
	if (/translat/i.test(lower))
		return { role: 'translation', lang: detectedLang || '' }

	// If no keyword detected but has a language, infer role
	if (detectedLang === routeLang) return { role: 'phrase', lang: routeLang }
	if (detectedLang) return { role: 'translation', lang: detectedLang }

	// Try to match full header text as a language name or code
	if (lower.length === 3 && languages[lower]) {
		if (lower === routeLang) return { role: 'phrase', lang: routeLang }
		return { role: 'translation', lang: lower }
	}
	const langEntry = Object.entries(languages).find(
		([, name]) => name.toLowerCase() === lower
	)
	if (langEntry) {
		if (langEntry[0] === routeLang) return { role: 'phrase', lang: routeLang }
		return { role: 'translation', lang: langEntry[0] }
	}

	return { role: 'skip', lang: '' }
}

export function buildPhrases(
	rows: Array<Array<string>>,
	mappings: Array<ColumnMapping>,
	includedRows: Array<boolean>
): Array<SpreadsheetPhrase> {
	const phraseColIndex = mappings.findIndex((m) => m.role === 'phrase')
	const translationCols = mappings
		.map((m, i) => ({ ...m, index: i }))
		.filter((m) => m.role === 'translation')
	const tagsCols = mappings
		.map((m, i) => ({ ...m, index: i }))
		.filter((m) => m.role === 'tags')

	if (phraseColIndex === -1) return []

	return rows
		.filter((_, i) => includedRows[i])
		.map((row) => {
			const phrase_text = row[phraseColIndex] || ''
			const translations = translationCols
				.map((col) => ({
					lang: col.lang,
					text: row[col.index] || '',
				}))
				.filter((t) => t.text.length > 0 && t.lang.length === 3)

			const tags = tagsCols
				.flatMap((col) =>
					(row[col.index] || '').split(',').map((t) => t.trim())
				)
				.filter((t) => t.length > 0)

			return { phrase_text, translations, tags }
		})
		.filter((p) => p.phrase_text.length > 0 && p.translations.length > 0)
}
