import { describe, it, expect } from 'vitest'
import {
	DeckSchema,
	CardSchema,
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

describe('DeckSchema', () => {
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
		const result = DeckSchema.parse(validDeck)
		expect(result.lang).toBe('hin')
		expect(result.daily_review_goal).toBe(15)
	})

	it('strips server-side stats columns no longer on the schema', () => {
		const result = DeckSchema.parse({
			...validDeck,
			cards_active: 20,
			count_reviews_7d: 45,
			lang_total_phrases: 100,
			most_recent_review_at: '2026-03-30T12:00:00Z',
		}) as Record<string, unknown>
		expect(result.cards_active).toBeUndefined()
		expect(result.most_recent_review_at).toBeUndefined()
		expect(result.lang_total_phrases).toBeUndefined()
	})

	it('accepts review_answer_mode values', () => {
		const deck2 = DeckSchema.parse({
			...validDeck,
			review_answer_mode: '2-buttons',
		})
		expect(deck2.review_answer_mode).toBe('2-buttons')

		const deck4 = DeckSchema.parse({
			...validDeck,
			review_answer_mode: '4-buttons',
		})
		expect(deck4.review_answer_mode).toBe('4-buttons')
	})

	it('defaults review_answer_mode to null', () => {
		const result = DeckSchema.parse(validDeck)
		expect(result.review_answer_mode).toBeNull()
	})

	it('defaults preferred_translation_lang to null', () => {
		const result = DeckSchema.parse(validDeck)
		expect(result.preferred_translation_lang).toBeNull()
	})

	it('accepts explicit preferred_translation_lang', () => {
		const result = DeckSchema.parse({
			...validDeck,
			preferred_translation_lang: 'fra',
		})
		expect(result.preferred_translation_lang).toBe('fra')
	})

	it('accepts all learning goal values', () => {
		for (const goal of ['moving', 'family', 'visiting']) {
			const result = DeckSchema.parse({
				...validDeck,
				learning_goal: goal,
			})
			expect(result.learning_goal).toBe(goal)
		}
	})

	it('rejects invalid learning goal', () => {
		expect(() =>
			DeckSchema.parse({ ...validDeck, learning_goal: 'tourism' })
		).toThrow()
	})

	it('strips the language name a cached row may still carry', () => {
		const result = DeckSchema.parse({
			...validDeck,
			language: 'Kannada',
		}) as Record<string, unknown>
		expect(result.language).toBeUndefined()
	})
})

describe('CardSchema', () => {
	const validCard = {
		id: 'aa440001-1111-4aaa-bbbb-222222222222',
		created_at: '2026-03-15T00:00:00Z',
		phrase_id: 'aa110001-1111-4aaa-bbbb-cccccccccccc',
		uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		lang: 'kan',
		status: 'active',
		updated_at: '2026-03-15T00:00:00Z',
	}

	it('parses a valid card', () => {
		const result = CardSchema.parse(validCard)
		expect(result.status).toBe('active')
		expect(result.direction).toBe('forward')
	})

	// A row carrying scheduler columns is not a `user_card` row.
	it('drops FSRS fields rather than carrying them on the card', () => {
		const result = CardSchema.parse({
			...validCard,
			last_reviewed_at: '2026-03-30T12:00:00Z',
			difficulty: 5.28,
			stability: 3.17,
		})
		expect(result).not.toHaveProperty('last_reviewed_at')
		expect(result).not.toHaveProperty('difficulty')
		expect(result).not.toHaveProperty('stability')
	})

	it('rejects invalid card status', () => {
		expect(() =>
			CardSchema.parse({ ...validCard, status: 'deleted' })
		).toThrow()
	})
})
