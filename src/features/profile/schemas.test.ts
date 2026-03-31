import { describe, it, expect } from 'vitest'
import {
	ReviewAnswerModeSchema,
	FontPreferenceSchema,
	MyProfileSchema,
	LanguageKnownSchema,
	LanguagesKnownSchema,
} from '@/features/profile/schemas'

describe('ReviewAnswerModeSchema', () => {
	it('accepts "4-buttons"', () => {
		expect(ReviewAnswerModeSchema.parse('4-buttons')).toBe('4-buttons')
	})

	it('accepts "2-buttons"', () => {
		expect(ReviewAnswerModeSchema.parse('2-buttons')).toBe('2-buttons')
	})

	it('rejects "3-buttons"', () => {
		expect(() => ReviewAnswerModeSchema.parse('3-buttons')).toThrow()
	})

	it('rejects empty string', () => {
		expect(() => ReviewAnswerModeSchema.parse('')).toThrow()
	})
})

describe('FontPreferenceSchema', () => {
	it('accepts "default"', () => {
		expect(FontPreferenceSchema.parse('default')).toBe('default')
	})

	it('accepts "dyslexic"', () => {
		expect(FontPreferenceSchema.parse('dyslexic')).toBe('dyslexic')
	})

	it('rejects invalid values', () => {
		expect(() => FontPreferenceSchema.parse('comic-sans')).toThrow()
	})
})

describe('LanguageKnownSchema', () => {
	it('parses a valid language entry', () => {
		const result = LanguageKnownSchema.parse({
			lang: 'hin',
			level: 'fluent',
		})
		expect(result.lang).toBe('hin')
		expect(result.level).toBe('fluent')
	})

	it('accepts all proficiency levels', () => {
		for (const level of ['fluent', 'proficient', 'beginner']) {
			expect(LanguageKnownSchema.parse({ lang: 'kan', level }).level).toBe(
				level
			)
		}
	})

	it('rejects invalid proficiency', () => {
		expect(() =>
			LanguageKnownSchema.parse({ lang: 'hin', level: 'expert' })
		).toThrow()
	})
})

describe('LanguagesKnownSchema', () => {
	it('requires at least one language', () => {
		expect(() => LanguagesKnownSchema.parse([])).toThrow()
	})

	it('accepts a valid array', () => {
		const result = LanguagesKnownSchema.parse([
			{ lang: 'eng', level: 'fluent' },
			{ lang: 'hin', level: 'beginner' },
		])
		expect(result).toHaveLength(2)
	})
})

describe('MyProfileSchema', () => {
	const validProfile = {
		uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		username: 'GarlicFace',
		avatar_path: 'hyrax-197033.jpeg',
		created_at: '2026-03-01T00:00:00Z',
		languages_known: [{ lang: 'eng', level: 'fluent' }],
		updated_at: null,
		font_preference: null,
		review_answer_mode: null,
	}

	it('parses a valid profile', () => {
		const result = MyProfileSchema.parse(validProfile)
		expect(result.username).toBe('GarlicFace')
	})

	it('defaults font_preference to "default" when omitted', () => {
		const { font_preference: _, ...withoutFont } = validProfile
		const result = MyProfileSchema.parse(withoutFont)
		expect(result.font_preference).toBe('default')
	})

	it('preserves null font_preference when explicitly null', () => {
		const result = MyProfileSchema.parse(validProfile)
		expect(result.font_preference).toBeNull()
	})

	it('defaults review_answer_mode to "4-buttons" when omitted', () => {
		const { review_answer_mode: _, ...withoutMode } = validProfile
		const result = MyProfileSchema.parse(withoutMode)
		expect(result.review_answer_mode).toBe('4-buttons')
	})

	it('preserves null review_answer_mode when explicitly null', () => {
		const result = MyProfileSchema.parse(validProfile)
		expect(result.review_answer_mode).toBeNull()
	})

	it('accepts explicit font_preference and review_answer_mode', () => {
		const result = MyProfileSchema.parse({
			...validProfile,
			font_preference: 'dyslexic',
			review_answer_mode: '2-buttons',
		})
		expect(result.font_preference).toBe('dyslexic')
		expect(result.review_answer_mode).toBe('2-buttons')
	})

	it('coerces null username to empty string', () => {
		const result = MyProfileSchema.parse({
			...validProfile,
			username: null,
		})
		expect(result.username).toBe('')
	})

	it('coerces null avatar_path to empty string', () => {
		const result = MyProfileSchema.parse({
			...validProfile,
			avatar_path: null,
		})
		expect(result.avatar_path).toBe('')
	})
})
