/**
 * Manifest entries encode both phrase_id and card direction as "phrase_id:direction".
 * Backward compat: entries without a colon are treated as "phrase_id:forward".
 */

import type { CardDirectionType } from '@/features/deck/schemas'
import type { uuid } from '@/types/main'

/** A manifest entry string like "abc-123:forward" or "abc-123:reverse" */
export type ManifestEntry = string

export function toManifestEntry(
	phraseId: uuid,
	direction: CardDirectionType
): ManifestEntry {
	return `${phraseId}:${direction}`
}

export function parseManifestEntry(entry: ManifestEntry): {
	phraseId: uuid
	direction: CardDirectionType
} {
	const colonIdx = entry.lastIndexOf(':')
	if (colonIdx === -1) return { phraseId: entry, direction: 'forward' }
	const suffix = entry.slice(colonIdx + 1)
	if (suffix === 'forward' || suffix === 'reverse') {
		return { phraseId: entry.slice(0, colonIdx), direction: suffix }
	}
	// Backward compat: bare UUID (no direction suffix)
	return { phraseId: entry, direction: 'forward' }
}

/** Extract just the phrase_id from a manifest entry */
export function manifestPhraseId(entry: ManifestEntry): uuid {
	return parseManifestEntry(entry).phraseId
}
