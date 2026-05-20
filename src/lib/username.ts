// Friendly throwaway username suggestion for the getting-started form.
// The user sees it pre-filled and can keep it or type their own. It is
// only a suggestion — uniqueness is enforced by the DB unique constraint
// on user_profile.username, and the form surfaces a collision on submit.
//
// Words are kept short (each <= 8 chars) so adjective + Animal + 2 digits
// stays within the form's 20-character max.

const adjectives = [
	'swift',
	'clever',
	'bright',
	'sunny',
	'happy',
	'gentle',
	'brave',
	'calm',
	'eager',
	'jolly',
	'keen',
	'lively',
	'merry',
	'nimble',
	'plucky',
	'quirky',
	'snappy',
	'witty',
	'cosy',
	'mellow',
	'spry',
	'chirpy',
	'breezy',
	'fuzzy',
]

const animals = [
	'otter',
	'fox',
	'sparrow',
	'panda',
	'koala',
	'badger',
	'heron',
	'lemur',
	'robin',
	'gecko',
	'puffin',
	'beaver',
	'marten',
	'finch',
	'ferret',
	'walrus',
	'mole',
	'newt',
	'quokka',
	'tapir',
	'wombat',
	'shrew',
	'dingo',
	'civet',
]

const pick = <T>(list: ReadonlyArray<T>): T =>
	list[Math.floor(Math.random() * list.length)]

const capitalize = (word: string): string =>
	word.charAt(0).toUpperCase() + word.slice(1)

export function generateUsername(): string {
	const number = Math.floor(Math.random() * 90) + 10
	return `${pick(adjectives)}${capitalize(pick(animals))}${number}`
}
