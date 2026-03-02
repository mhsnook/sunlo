import { describe, it, expect } from 'vitest'
import { parseSearchInput, type SearchFilter } from './parse-search-input'

describe('parseSearchInput', () => {
	const noFilters: Array<SearchFilter> = []
	const noTags: Array<string> = []

	// --- Empty / trivial input ---

	it('returns empty for blank input', () => {
		const result = parseSearchInput('', noFilters, noTags)
		expect(result.effectiveText).toBe('')
		expect(result.suggestions).toEqual([])
	})

	it('returns empty for whitespace-only input', () => {
		const result = parseSearchInput('   ', noFilters, noTags)
		expect(result.effectiveText).toBe('')
		expect(result.suggestions).toEqual([])
	})

	// --- Language suggestion detection ---

	it('suggests a language filter when input contains a language name', () => {
		const result = parseSearchInput('hello in hindi', noFilters, noTags)
		const langSuggestion = result.suggestions.find((s) => s.type === 'lang')
		expect(langSuggestion).toBeDefined()
		expect(langSuggestion!.value).toBe('hin')
		expect(langSuggestion!.label).toBe('Hindi')
	})

	it('suggests a language from a partial match (3+ chars)', () => {
		const result = parseSearchInput('spa phrases', noFilters, noTags)
		const langSuggestion = result.suggestions.find((s) => s.type === 'lang')
		expect(langSuggestion).toBeDefined()
		expect(langSuggestion!.label).toBe('Spanish')
	})

	it('does not suggest a language already in filters', () => {
		const filters: Array<SearchFilter> = [
			{ type: 'lang', value: 'hin', label: 'Hindi' },
		]
		const result = parseSearchInput('hindi greetings', filters, noTags)
		const langSuggestion = result.suggestions.find((s) => s.type === 'lang')
		expect(langSuggestion).toBeUndefined()
	})

	// --- Tag suggestion detection ---

	it('suggests a tag filter when input contains a tag name', () => {
		const tags = ['greetings', 'food', 'travel']
		const result = parseSearchInput('greetings please', noFilters, tags)
		const tagSuggestion = result.suggestions.find((s) => s.type === 'tag')
		expect(tagSuggestion).toBeDefined()
		expect(tagSuggestion!.value).toBe('greetings')
	})

	it('does not suggest a tag already in filters', () => {
		const tags = ['greetings', 'food']
		const filters: Array<SearchFilter> = [
			{ type: 'tag', value: 'greetings', label: 'greetings' },
		]
		const result = parseSearchInput('greetings hello', filters, tags)
		const tagSuggestion = result.suggestions.find(
			(s) => s.type === 'tag' && s.value === 'greetings'
		)
		expect(tagSuggestion).toBeUndefined()
	})

	// --- Language word stripping ---

	it('strips language name words from text when lang filter is active', () => {
		const filters: Array<SearchFilter> = [
			{ type: 'lang', value: 'hin', label: 'Hindi' },
		]
		const result = parseSearchInput('hindi for have a hot dog', filters, noTags)
		expect(result.effectiveText).toBe('have hot dog')
	})

	it('strips prepositions that become orphaned after language stripping', () => {
		const filters: Array<SearchFilter> = [
			{ type: 'lang', value: 'hin', label: 'Hindi' },
		]
		const result = parseSearchInput('hello in hindi', filters, noTags)
		expect(result.effectiveText).toBe('hello')
	})

	// --- Tag words are NOT stripped ---

	it('does NOT strip tag name words from text when tag filter is active', () => {
		const tags = ['hot dog']
		const filters: Array<SearchFilter> = [
			{ type: 'tag', value: 'hot dog', label: 'hot dog' },
		]
		const result = parseSearchInput('have a hot dog', filters, tags)
		expect(result.effectiveText).toBe('have a hot dog')
	})

	it('strips lang words but preserves tag words when both filters active', () => {
		const tags = ['hot dog']
		const filters: Array<SearchFilter> = [
			{ type: 'lang', value: 'hin', label: 'Hindi' },
			{ type: 'tag', value: 'hot dog', label: 'hot dog' },
		]
		const result = parseSearchInput('hindi for have a hot dog', filters, tags)
		// "hindi" stripped (lang filter), "for"/"a" stripped (orphaned prepositions)
		// "hot" and "dog" preserved (tag filter, not lang)
		expect(result.effectiveText).toBe('have hot dog')
	})

	// --- Combined scenarios ---

	it('suggests lang and tag simultaneously', () => {
		const tags = ['greetings', 'food']
		const result = parseSearchInput('greetings in spanish', noFilters, tags)
		const langSuggestion = result.suggestions.find((s) => s.type === 'lang')
		const tagSuggestion = result.suggestions.find((s) => s.type === 'tag')
		expect(langSuggestion).toBeDefined()
		expect(langSuggestion!.label).toBe('Spanish')
		expect(tagSuggestion).toBeDefined()
		expect(tagSuggestion!.value).toBe('greetings')
	})

	it('passes through plain search text unchanged when no filters active', () => {
		const result = parseSearchInput('have a hot dog', noFilters, noTags)
		expect(result.effectiveText).toBe('have a hot dog')
	})

	it('limits suggestions to 3', () => {
		const tags = ['aaa', 'bbb', 'ccc', 'ddd']
		const result = parseSearchInput('aaa bbb ccc ddd', noFilters, tags)
		expect(result.suggestions.length).toBeLessThanOrEqual(3)
	})

	it('ignores words shorter than 3 characters for matching', () => {
		// "in" is only 2 chars, should not match "Indonesian" etc.
		const result = parseSearchInput('in', noFilters, noTags)
		expect(result.suggestions).toEqual([])
	})
})
