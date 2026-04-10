import type { CardDirectionType } from './schemas'

/**
 * Returns which card directions should exist for a phrase.
 * Phrases flagged `only_reverse` get only a reverse card;
 * all others get both forward and reverse.
 */
export function directionsForPhrase(
	onlyReverse: boolean | null | undefined
): Array<CardDirectionType> {
	return onlyReverse ? ['reverse'] : ['forward', 'reverse']
}
