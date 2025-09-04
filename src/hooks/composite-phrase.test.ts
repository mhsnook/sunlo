import { describe, it, expect } from 'vitest'
import { splitPhraseTranslations } from './composite-phrase'
import { PhraseStub, TranslationStub } from '@/types/main'

describe('splitPhraseTranslations', () => {
	const basePhrase: PhraseStub = {
		id: 'phrase-1',
		lang: 'spa',
		text: 'Hola mundo',
		tags: [],
		translations: [
			{ id: 't-1', lang: 'eng', text: 'Hello world' },
			{ id: 't-2', lang: 'fra', text: 'Bonjour le monde' },
			{ id: 't-3', lang: 'deu', text: 'Hallo Welt' },
			{ id: 't-4', lang: 'eng', text: 'Hi world' },
		],
	}

	it('should return all translations in translations_other if languagesToShow is empty', () => {
		const result = splitPhraseTranslations(basePhrase, [])
		expect(result.translations_other).toEqual(basePhrase.translations)
		expect(result.translations_mine).toEqual([])
	})

	it('should correctly split translations into mine and other based on languagesToShow', () => {
		const languagesToShow = ['eng', 'deu']
		const result = splitPhraseTranslations(basePhrase, languagesToShow)

		const expectedMine: Array<TranslationStub> = [
			{ id: 't-1', lang: 'eng', text: 'Hello world' },
			{ id: 't-3', lang: 'deu', text: 'Hallo Welt' },
			{ id: 't-4', lang: 'eng', text: 'Hi world' },
		]

		const expectedOther: Array<TranslationStub> = [
			{ id: 't-2', lang: 'fra', text: 'Bonjour le monde' },
		]

		expect(result.translations_mine).toHaveLength(3)
		expect(result.translations_mine).toEqual(
			expect.arrayContaining(expectedMine)
		)

		expect(result.translations_other).toHaveLength(1)
		expect(result.translations_other).toEqual(
			expect.arrayContaining(expectedOther)
		)
	})

	it('should handle cases where no translations match languagesToShow', () => {
		const languagesToShow = ['jpn', 'kor']
		const result = splitPhraseTranslations(basePhrase, languagesToShow)

		expect(result.translations_mine).toEqual([])
		expect(result.translations_other).toHaveLength(4)
		expect(result.translations_other).toEqual(
			expect.arrayContaining(basePhrase.translations)
		)
	})

	it('should handle cases where all translations match languagesToShow', () => {
		const languagesToShow = ['eng', 'fra', 'deu']
		const result = splitPhraseTranslations(basePhrase, languagesToShow)

		expect(result.translations_mine).toHaveLength(4)
		expect(result.translations_mine).toEqual(
			expect.arrayContaining(basePhrase.translations)
		)
		expect(result.translations_other).toEqual([])
	})

	it('should return the original phrase properties', () => {
		const languagesToShow = ['eng']
		const result = splitPhraseTranslations(basePhrase, languagesToShow)
		// Programmatically check that all properties from basePhrase
		// are present and correct in the result.
		;(Object.keys(basePhrase) as Array<keyof PhraseStub>).forEach((key) => {
			expect(result[key]).toEqual(basePhrase[key])
		})
	})

	it('should handle phrases with no translations', () => {
		const phraseWithoutTranslations: PhraseStub = {
			...basePhrase,
			translations: [],
		}
		const languagesToShow = ['eng']
		const result = splitPhraseTranslations(
			phraseWithoutTranslations,
			languagesToShow
		)

		expect(result.translations_mine).toEqual([])
		expect(result.translations_other).toEqual([])
	})

	it('should handle empty translations gracefully', () => {
		// phrase.translations is always an array
		const phraseWithUndefinedTranslations: PhraseStub = {
			...basePhrase,
			translations: [],
		}
		const languagesToShow = ['eng']
		const result = splitPhraseTranslations(
			phraseWithUndefinedTranslations,
			languagesToShow
		)

		expect(result.translations_mine).toEqual([])
		expect(result.translations_other).toEqual([])
	})
})
