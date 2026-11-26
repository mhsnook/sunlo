import { describe, expect, it } from 'vitest'
import { MAX_SPEECH_CHARS } from '../../shared/crew'
import { speakable } from './speakable'

describe('speakable', () => {
	it('drops markup and keeps the words', () => {
		expect(
			speakable(
				'## Sitrep\n\n**Retention** is up. See [the deck](https://x.test).\n\n- One\n- Two'
			)
		).toBe('Sitrep\nRetention is up. See the deck.\nOne\nTwo')
	})

	it('mentions a chart instead of reading its JSON', () => {
		const text = speakable('Here it is:\n\n```chart\n{"type":"line"}\n```')
		expect(text).toBe('Here it is:\nThere is a chart in the message.')
	})

	it('skips plain code', () => {
		expect(speakable('Run this:\n\n```sql\nselect 1\n```')).toBe('Run this:')
	})

	it('cuts a long reply at a sentence end within the limit', () => {
		const text = speakable('This is one sentence. '.repeat(200))
		expect(text.length).toBeLessThanOrEqual(MAX_SPEECH_CHARS)
		expect(text.endsWith('sentence.')).toBe(true)
	})
})
