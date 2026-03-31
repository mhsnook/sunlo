import { describe, it, expect } from 'vitest'
import {
	NotificationSchema,
	NotificationTypeSchema,
} from '@/features/notifications/schemas'

describe('NotificationTypeSchema', () => {
	it('accepts all valid notification types', () => {
		const validTypes = [
			'request_commented',
			'comment_replied',
			'phrase_translated',
			'phrase_referenced',
			'request_upvoted',
			'change_suggested',
		]
		for (const type of validTypes) {
			expect(NotificationTypeSchema.parse(type)).toBe(type)
		}
	})

	it('rejects invalid notification type', () => {
		expect(() => NotificationTypeSchema.parse('invalid_type')).toThrow()
	})
})

describe('NotificationSchema', () => {
	const validNotification = {
		id: '11111111-1111-1111-1111-111111111111',
		uid: '22222222-2222-2222-2222-222222222222',
		type: 'request_commented',
		actor_uid: '33333333-3333-3333-3333-333333333333',
		request_id: '44444444-4444-4444-4444-444444444444',
		comment_id: null,
		phrase_id: null,
		read_at: null,
		created_at: '2026-03-31T12:00:00Z',
	}

	it('parses a valid notification', () => {
		const result = NotificationSchema.parse(validNotification)
		expect(result.id).toBe(validNotification.id)
		expect(result.type).toBe('request_commented')
		expect(result.read_at).toBeNull()
	})

	it('parses a notification with read_at set', () => {
		const readNotification = {
			...validNotification,
			read_at: '2026-03-31T14:00:00Z',
		}
		const result = NotificationSchema.parse(readNotification)
		expect(result.read_at).toBe('2026-03-31T14:00:00Z')
	})

	it('allows nullable foreign keys', () => {
		const result = NotificationSchema.parse({
			...validNotification,
			request_id: null,
			comment_id: null,
			phrase_id: null,
		})
		expect(result.request_id).toBeNull()
		expect(result.comment_id).toBeNull()
		expect(result.phrase_id).toBeNull()
	})

	it('accepts all reference fields populated', () => {
		const fullNotification = {
			...validNotification,
			request_id: '44444444-4444-4444-4444-444444444444',
			comment_id: '55555555-5555-5555-5555-555555555555',
			phrase_id: '66666666-6666-6666-6666-666666666666',
		}
		const result = NotificationSchema.parse(fullNotification)
		expect(result.request_id).toBe(fullNotification.request_id)
		expect(result.comment_id).toBe(fullNotification.comment_id)
		expect(result.phrase_id).toBe(fullNotification.phrase_id)
	})

	it('rejects missing required fields', () => {
		expect(() => NotificationSchema.parse({})).toThrow()
		expect(() =>
			NotificationSchema.parse({ ...validNotification, uid: undefined })
		).toThrow()
		expect(() =>
			NotificationSchema.parse({ ...validNotification, type: undefined })
		).toThrow()
	})

	it('rejects invalid uuid for id', () => {
		expect(() =>
			NotificationSchema.parse({ ...validNotification, id: 'not-a-uuid' })
		).toThrow()
	})

	it('rejects invalid notification type', () => {
		expect(() =>
			NotificationSchema.parse({ ...validNotification, type: 'bogus' })
		).toThrow()
	})
})
