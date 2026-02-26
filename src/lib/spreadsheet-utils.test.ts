import { describe, it, expect } from 'vitest'
import {
	parseTsv,
	detectColumnMapping,
	buildPhrases,
} from './spreadsheet-utils'

// ---------------------------------------------------------------------------
// parseTsv
// ---------------------------------------------------------------------------
describe('parseTsv', () => {
	it('parses tab-separated data', () => {
		const input = 'phrase\ttranslation\nhello\thola'
		const { headers, rows } = parseTsv(input)
		expect(headers).toEqual(['phrase', 'translation'])
		expect(rows).toEqual([['hello', 'hola']])
	})

	it('parses comma-separated data when no tabs present', () => {
		const input = 'phrase,translation\nhello,hola'
		const { headers, rows } = parseTsv(input)
		expect(headers).toEqual(['phrase', 'translation'])
		expect(rows).toEqual([['hello', 'hola']])
	})

	it('prefers tab delimiter when both tabs and commas are present', () => {
		const input = 'phrase\ttranslation,extra\nhello\thola,world'
		const { headers, rows } = parseTsv(input)
		expect(headers).toEqual(['phrase', 'translation,extra'])
		expect(rows).toEqual([['hello', 'hola,world']])
	})

	it('returns empty for empty input', () => {
		const { headers, rows } = parseTsv('')
		expect(headers).toEqual([])
		expect(rows).toEqual([])
	})

	it('returns empty for whitespace-only input', () => {
		const { headers, rows } = parseTsv('   \n  ')
		expect(headers).toEqual([])
		expect(rows).toEqual([])
	})

	it('returns empty for single line (headers only, no data)', () => {
		const { headers, rows } = parseTsv('phrase\ttranslation')
		expect(headers).toEqual([])
		expect(rows).toEqual([])
	})

	it('trims whitespace from headers and cells', () => {
		const input = ' phrase \t translation \n hello \t hola '
		const { headers, rows } = parseTsv(input)
		expect(headers).toEqual(['phrase', 'translation'])
		expect(rows).toEqual([['hello', 'hola']])
	})

	it('filters out empty rows', () => {
		const input = 'phrase\ttranslation\nhello\thola\n\t\ngoodbye\tadiós'
		const { rows } = parseTsv(input)
		expect(rows).toHaveLength(2)
		expect(rows[0]).toEqual(['hello', 'hola'])
		expect(rows[1]).toEqual(['goodbye', 'adiós'])
	})

	it('handles trailing newlines', () => {
		const input = 'phrase\ttranslation\nhello\thola\n\n'
		const { headers, rows } = parseTsv(input)
		expect(headers).toEqual(['phrase', 'translation'])
		expect(rows).toEqual([['hello', 'hola']])
	})

	it('handles multiple data rows', () => {
		const input =
			'phrase\ttranslation\ttags\nhello\thola\tgreetings\ngoodbye\tadiós\tgreetings, basics'
		const { headers, rows } = parseTsv(input)
		expect(headers).toEqual(['phrase', 'translation', 'tags'])
		expect(rows).toHaveLength(2)
		expect(rows[1]).toEqual(['goodbye', 'adiós', 'greetings, basics'])
	})

	it('handles rows with fewer columns than headers', () => {
		const input = 'a\tb\tc\n1\t2'
		const { rows } = parseTsv(input)
		expect(rows).toEqual([['1', '2']])
	})

	it('handles rows with more columns than headers', () => {
		const input = 'a\tb\n1\t2\t3'
		const { rows } = parseTsv(input)
		expect(rows).toEqual([['1', '2', '3']])
	})
})

// ---------------------------------------------------------------------------
// detectColumnMapping
// ---------------------------------------------------------------------------
describe('detectColumnMapping', () => {
	const routeLang = 'hin'

	describe('keyword detection', () => {
		it('detects "phrase" keyword', () => {
			const result = detectColumnMapping('phrase', routeLang)
			expect(result).toEqual({ role: 'phrase', lang: 'hin' })
		})

		it('detects "Phrase" case-insensitively', () => {
			const result = detectColumnMapping('Phrase', routeLang)
			expect(result).toEqual({ role: 'phrase', lang: 'hin' })
		})

		it('detects "translation" keyword', () => {
			const result = detectColumnMapping('translation', routeLang)
			expect(result).toEqual({ role: 'translation', lang: '' })
		})

		it('detects "Translation" case-insensitively', () => {
			const result = detectColumnMapping('Translation', routeLang)
			expect(result).toEqual({ role: 'translation', lang: '' })
		})

		it('detects partial match "translat" (e.g. "translated")', () => {
			const result = detectColumnMapping('translated text', routeLang)
			expect(result).toEqual({ role: 'translation', lang: '' })
		})

		it('detects "tags" keyword', () => {
			const result = detectColumnMapping('tags', routeLang)
			expect(result).toEqual({ role: 'tags', lang: '' })
		})

		it('detects "Tag" (singular) keyword', () => {
			const result = detectColumnMapping('Tag', routeLang)
			expect(result).toEqual({ role: 'tags', lang: '' })
		})

		it('returns skip for unrecognized header', () => {
			const result = detectColumnMapping('notes', routeLang)
			expect(result).toEqual({ role: 'skip', lang: '' })
		})
	})

	describe('parenthetical language detection', () => {
		it('detects 3-letter code in parentheses for phrase', () => {
			const result = detectColumnMapping('phrase (kan)', routeLang)
			expect(result).toEqual({ role: 'phrase', lang: 'kan' })
		})

		it('detects 3-letter code in parentheses for translation', () => {
			const result = detectColumnMapping('translation (eng)', routeLang)
			expect(result).toEqual({ role: 'translation', lang: 'eng' })
		})

		it('detects full language name in parentheses', () => {
			const result = detectColumnMapping('translation (Spanish)', routeLang)
			expect(result).toEqual({ role: 'translation', lang: 'spa' })
		})

		it('falls back to routeLang when phrase has no language in parens', () => {
			const result = detectColumnMapping('phrase (unknown)', routeLang)
			expect(result).toEqual({ role: 'phrase', lang: 'hin' })
		})

		it('falls back to empty lang when translation has unknown parens', () => {
			const result = detectColumnMapping('translation (xyz)', routeLang)
			expect(result).toEqual({ role: 'translation', lang: '' })
		})
	})

	describe('language-as-header detection', () => {
		it('detects 3-letter language code as translation', () => {
			const result = detectColumnMapping('eng', routeLang)
			expect(result).toEqual({ role: 'translation', lang: 'eng' })
		})

		it('detects 3-letter code matching routeLang as phrase', () => {
			const result = detectColumnMapping('hin', 'hin')
			expect(result).toEqual({ role: 'phrase', lang: 'hin' })
		})

		it('detects full language name "English" as translation', () => {
			const result = detectColumnMapping('English', routeLang)
			expect(result).toEqual({ role: 'translation', lang: 'eng' })
		})

		it('detects full language name "Spanish" as translation', () => {
			const result = detectColumnMapping('Spanish', routeLang)
			expect(result).toEqual({ role: 'translation', lang: 'spa' })
		})

		it('detects language name matching routeLang as phrase', () => {
			const result = detectColumnMapping('Hindi', 'hin')
			expect(result).toEqual({ role: 'phrase', lang: 'hin' })
		})

		it('skips unknown 3-letter code not in languages list', () => {
			const result = detectColumnMapping('xyz', routeLang)
			expect(result).toEqual({ role: 'skip', lang: '' })
		})
	})

	describe('language inferred from parenthetical without keyword', () => {
		it('infers phrase role when paren language matches routeLang', () => {
			const result = detectColumnMapping('my column (hin)', 'hin')
			expect(result).toEqual({ role: 'phrase', lang: 'hin' })
		})

		it('infers translation role when paren language differs from routeLang', () => {
			const result = detectColumnMapping('my column (spa)', 'hin')
			expect(result).toEqual({ role: 'translation', lang: 'spa' })
		})
	})

	describe('whitespace handling', () => {
		it('trims header before processing', () => {
			const result = detectColumnMapping('  phrase  ', routeLang)
			expect(result).toEqual({ role: 'phrase', lang: 'hin' })
		})

		it('trims language code header', () => {
			const result = detectColumnMapping('  eng  ', routeLang)
			expect(result).toEqual({ role: 'translation', lang: 'eng' })
		})
	})
})

// ---------------------------------------------------------------------------
// buildPhrases
// ---------------------------------------------------------------------------
describe('buildPhrases', () => {
	it('builds phrases from rows with valid mappings', () => {
		const rows = [['hello', 'hola', 'greetings']]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
			{ role: 'tags' as const, lang: '' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result).toEqual([
			{
				phrase_text: 'hello',
				translations: [{ lang: 'eng', text: 'hola' }],
				tags: ['greetings'],
			},
		])
	})

	it('handles multiple translation columns', () => {
		const rows = [['hola', 'hello', 'bonjour']]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
			{ role: 'translation' as const, lang: 'fra' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result).toHaveLength(1)
		expect(result[0].translations).toEqual([
			{ lang: 'eng', text: 'hello' },
			{ lang: 'fra', text: 'bonjour' },
		])
	})

	it('splits comma-separated tags', () => {
		const rows = [['hello', 'hola', 'greetings, basics, common']]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
			{ role: 'tags' as const, lang: '' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result[0].tags).toEqual(['greetings', 'basics', 'common'])
	})

	it('filters out excluded rows', () => {
		const rows = [
			['hello', 'hola'],
			['goodbye', 'adiós'],
			['thanks', 'gracias'],
		]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
		]
		const included = [true, false, true]

		const result = buildPhrases(rows, mappings, included)
		expect(result).toHaveLength(2)
		expect(result[0].phrase_text).toBe('hello')
		expect(result[1].phrase_text).toBe('thanks')
	})

	it('filters out rows with empty phrase text', () => {
		const rows = [
			['hello', 'hola'],
			['', 'adiós'],
		]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
		]
		const included = [true, true]

		const result = buildPhrases(rows, mappings, included)
		expect(result).toHaveLength(1)
		expect(result[0].phrase_text).toBe('hello')
	})

	it('filters out rows with no valid translations', () => {
		const rows = [
			['hello', 'hola'],
			['goodbye', ''],
		]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
		]
		const included = [true, true]

		const result = buildPhrases(rows, mappings, included)
		expect(result).toHaveLength(1)
		expect(result[0].phrase_text).toBe('hello')
	})

	it('filters out translations with invalid lang code (not 3 chars)', () => {
		const rows = [['hello', 'hola', 'bonjour']]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'en' }, // only 2 chars
			{ role: 'translation' as const, lang: 'fra' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result[0].translations).toEqual([{ lang: 'fra', text: 'bonjour' }])
	})

	it('returns empty array when no phrase column exists', () => {
		const rows = [['hello', 'hola']]
		const mappings = [
			{ role: 'translation' as const, lang: 'eng' },
			{ role: 'translation' as const, lang: 'spa' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result).toEqual([])
	})

	it('returns empty array for empty rows', () => {
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
		]
		const result = buildPhrases([], mappings, [])
		expect(result).toEqual([])
	})

	it('handles skipped columns', () => {
		const rows = [['hello', 'some note', 'hola']]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'skip' as const, lang: '' },
			{ role: 'translation' as const, lang: 'eng' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result).toEqual([
			{
				phrase_text: 'hello',
				translations: [{ lang: 'eng', text: 'hola' }],
				tags: [],
			},
		])
	})

	it('handles multiple tag columns', () => {
		const rows = [['hello', 'hola', 'greetings', 'common, easy']]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
			{ role: 'tags' as const, lang: '' },
			{ role: 'tags' as const, lang: '' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result[0].tags).toEqual(['greetings', 'common', 'easy'])
	})

	it('trims tag values and filters empties', () => {
		const rows = [['hello', 'hola', ' greetings , , basics ']]
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
			{ role: 'tags' as const, lang: '' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		expect(result[0].tags).toEqual(['greetings', 'basics'])
	})

	it('handles row with missing cells gracefully', () => {
		const rows = [['hello']] // only 1 cell but mapping expects 2
		const mappings = [
			{ role: 'phrase' as const, lang: 'spa' },
			{ role: 'translation' as const, lang: 'eng' },
		]
		const included = [true]

		const result = buildPhrases(rows, mappings, included)
		// No translation text → filtered out
		expect(result).toEqual([])
	})
})
