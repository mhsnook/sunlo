/**
 * Manifest entries encode both phrase_id and card direction as "phrase_id:direction".
 * Backward compat: entries without a colon are treated as "phrase_id:forward".
 */

import type { CardDirectionType } from '@/features/deck/schemas'
import type { uuid } from '@/types/main'

/**
 * A manifest entry string like "abc-123:forward" or "abc-123:reverse".
 *
 * Branded so `Map<ManifestEntry, T>` rejects a bare `phrase_id` at compile
 * time — the only way to produce one is `toManifestEntry()` or the
 * `asManifestEntry()` trust-boundary cast for strings read from the DB.
 */
declare const manifestEntryBrand: unique symbol
export type ManifestEntry = string & { readonly [manifestEntryBrand]: true }

export function toManifestEntry(
	phraseId: uuid,
	direction: CardDirectionType
): ManifestEntry {
	return `${phraseId}:${direction}` as ManifestEntry
}

/**
 * Trust-boundary cast for strings already known to be manifest entries
 * (e.g. values read from `user_deck_review_state.manifest`, or test fixtures).
 * Prefer `toManifestEntry()` when constructing from components.
 */
export function asManifestEntry(s: string): ManifestEntry {
	return s as ManifestEntry
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
