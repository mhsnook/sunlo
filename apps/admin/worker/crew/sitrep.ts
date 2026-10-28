import type { SitrepType } from '../../shared/crew'

// The Situation Report as every agent reads it in its <crew-context>.
export function sitrepContext(
	sitrep: SitrepType,
	stamp: (iso: string) => string
) {
	return [
		'## The Situation Report: where Sunlo and each room stand now',
		sitrep
			? `${sitrep.text}\n\n(Last written by ${sitrep.byName}, ${stamp(sitrep.at)}.)`
			: '(Nobody has written it yet.)',
	].join('\n\n')
}
