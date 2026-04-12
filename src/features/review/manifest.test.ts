import { describe, it, expect } from 'vitest'
import {
	toManifestEntry,
	parseManifestEntry,
	manifestPhraseId,
	type ManifestEntry,
} from '@/features/review/manifest'

const UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('toManifestEntry', () => {
	it('encodes forward', () => {
		expect(toManifestEntry(UUID, 'forward')).toBe(`${UUID}:forward`)
	})

	it('encodes reverse', () => {
		expect(toManifestEntry(UUID, 'reverse')).toBe(`${UUID}:reverse`)
	})
})

describe('parseManifestEntry', () => {
	it('parses forward entry', () => {
		expect(parseManifestEntry(toManifestEntry(UUID, 'forward'))).toEqual({
			phraseId: UUID,
			direction: 'forward',
		})
	})

	it('parses reverse entry', () => {
		expect(parseManifestEntry(toManifestEntry(UUID, 'reverse'))).toEqual({
			phraseId: UUID,
			direction: 'reverse',
		})
	})

	it('treats bare UUID as forward (backward compat)', () => {
		// Legacy manifest rows stored bare UUIDs; cast inline since
		// toManifestEntry always includes a direction suffix.
		expect(parseManifestEntry(UUID as ManifestEntry)).toEqual({
			phraseId: UUID,
			direction: 'forward',
		})
	})

	it('handles UUID containing colons in the id portion', () => {
		// UUIDs don't contain colons, but test lastIndexOf behavior
		const weird = 'not:a:uuid:forward' as ManifestEntry
		expect(parseManifestEntry(weird)).toEqual({
			phraseId: 'not:a:uuid',
			direction: 'forward',
		})
	})

	it('treats unknown suffix as forward (backward compat)', () => {
		const entry = `${UUID}:something-else` as ManifestEntry
		expect(parseManifestEntry(entry)).toEqual({
			phraseId: entry,
			direction: 'forward',
		})
	})
})

describe('manifestPhraseId', () => {
	it('extracts phrase id from forward entry', () => {
		expect(manifestPhraseId(toManifestEntry(UUID, 'forward'))).toBe(UUID)
	})

	it('extracts phrase id from reverse entry', () => {
		expect(manifestPhraseId(toManifestEntry(UUID, 'reverse'))).toBe(UUID)
	})

	it('extracts phrase id from bare UUID', () => {
		expect(manifestPhraseId(UUID as ManifestEntry)).toBe(UUID)
	})
})

describe('roundtrip', () => {
	it('parse(to(id, dir)) returns original values', () => {
		for (const dir of ['forward', 'reverse'] as const) {
			const entry = toManifestEntry(UUID, dir)
			const parsed = parseManifestEntry(entry)
			expect(parsed.phraseId).toBe(UUID)
			expect(parsed.direction).toBe(dir)
		}
	})
})
