import { describe, it, expect } from 'vitest'
import {
	DeckMetaRawSchema,
	DeckMetaSchema,
	CardMetaSchema,
	CardStatusEnumSchema,
} from '@/features/deck/schemas'

describe('CardStatusEnumSchema', () => {
	it('accepts all valid statuses', () => {
		for (const status of ['active', 'learned', 'skipped']) {
			expect(CardStatusEnumSchema.parse(status)).toBe(status)
		}
	})

	it('rejects invalid status', () => {
		expect(() => CardStatusEnumSchema.parse('archived')).toThrow()
	})
})

describe('DeckMetaRawSchema', () => {
	const validDeck = {
		uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		lang: 'hin',
		created_at: '2026-03-01T00:00:00Z',
		archived: false,
		daily_review_goal: 15,
		learning_goal: 'moving',
		preferred_translation_lang: null,
		review_answer_mode: null,
	}

	it('parses a valid deck with defaults', () => {
		const result = DeckMetaRawSchema.parse(validDeck)
		expect(result.lang).toBe('hin')
		expect(result.daily_review_goal).toBe(15)
		expect(result.cards_active).toBe(0)
		expect(result.cards_learned).toBe(0)
		expect(result.cards_skipped).toBe(0)
		expect(result.count_reviews_7d).toBe(0)
	})

	it('accepts review_answer_mode values', () => {
		const deck2 = DeckMetaRawSchema.parse({
			...validDeck,
			review_answer_mode: '2-buttons',
		})
		expect(deck2.review_answer_mode).toBe('2-buttons')

		const deck4 = DeckMetaRawSchema.parse({
			...validDeck,
			review_answer_mode: '4-buttons',
		})
		expect(deck4.review_answer_mode).toBe('4-buttons')
	})

	it('defaults review_answer_mode to null', () => {
		const result = DeckMetaRawSchema.parse(validDeck)
		expect(result.review_answer_mode).toBeNull()
	})

	it('defaults preferred_translation_lang to null', () => {
		const result = DeckMetaRawSchema.parse(validDeck)
		expect(result.preferred_translation_lang).toBeNull()
	})

	it('accepts explicit preferred_translation_lang', () => {
		const result = DeckMetaRawSchema.parse({
			...validDeck,
			preferred_translation_lang: 'fra',
		})
		expect(result.preferred_translation_lang).toBe('fra')
	})

	it('accepts all learning goal values', () => {
		for (const goal of ['moving', 'family', 'visiting']) {
			const result = DeckMetaRawSchema.parse({
				...validDeck,
				learning_goal: goal,
			})
			expect(result.learning_goal).toBe(goal)
		}
	})

	it('rejects invalid learning goal', () => {
		expect(() =>
			DeckMetaRawSchema.parse({ ...validDeck, learning_goal: 'tourism' })
		).toThrow()
	})

	it('defaults most_recent_review_at to null', () => {
		const result = DeckMetaRawSchema.parse(validDeck)
		expect(result.most_recent_review_at).toBeNull()
	})

	it('accepts populated stats fields', () => {
		const result = DeckMetaRawSchema.parse({
			...validDeck,
			cards_active: 20,
			cards_learned: 5,
			cards_skipped: 2,
			count_reviews_7d: 45,
			count_reviews_7d_positive: 38,
			lang_total_phrases: 100,
			most_recent_review_at: '2026-03-30T12:00:00Z',
		})
		expect(result.cards_active).toBe(20)
		expect(result.count_reviews_7d_positive).toBe(38)
		expect(result.most_recent_review_at).toBe('2026-03-30T12:00:00Z')
	})
})

describe('DeckMetaSchema (extended)', () => {
	it('requires theme and language in addition to raw fields', () => {
		const result = DeckMetaSchema.parse({
			uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
			lang: 'kan',
			created_at: '2026-03-01T00:00:00Z',
			archived: false,
			daily_review_goal: 15,
			learning_goal: 'moving',
			preferred_translation_lang: null,
			review_answer_mode: null,
			theme: 3,
			language: 'Kannada',
		})
		expect(result.theme).toBe(3)
		expect(result.language).toBe('Kannada')
	})
})

describe('CardMetaSchema', () => {
	const validCard = {
		id: 'aa440001-1111-4aaa-bbbb-222222222222',
		created_at: '2026-03-15T00:00:00Z',
		phrase_id: 'aa110001-1111-4aaa-bbbb-cccccccccccc',
		uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		lang: 'kan',
		status: 'active',
		updated_at: '2026-03-15T00:00:00Z',
		last_reviewed_at: null,
		difficulty: null,
		stability: null,
	}

	it('parses a valid card', () => {
		const result = CardMetaSchema.parse(validCard)
		expect(result.status).toBe('active')
		expect(result.last_reviewed_at).toBeNull()
	})

	it('accepts card with FSRS fields', () => {
		const result = CardMetaSchema.parse({
			...validCard,
			last_reviewed_at: '2026-03-30T12:00:00Z',
			difficulty: 5.28,
			stability: 3.17,
		})
		expect(result.difficulty).toBe(5.28)
		expect(result.stability).toBe(3.17)
	})

	it('rejects invalid card status', () => {
		expect(() =>
			CardMetaSchema.parse({ ...validCard, status: 'deleted' })
		).toThrow()
	})
})
