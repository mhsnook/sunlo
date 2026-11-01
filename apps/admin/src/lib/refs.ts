import { documentIdInHref } from '../../shared/crew'

// What a link in an agent's text points at inside the app: a room's document,
// or an issue or pull request on GitHub. remarkCrew turns a bare "#854" into
// a `github:854` link, so both kinds reach CrewText as links.
export type RefTarget =
	| { kind: 'doc'; id: number }
	| { kind: 'github'; number: number }

export const githubHref = (number: number) => `github:${number}`

export function parseRef(href: string): RefTarget | null {
	const id = documentIdInHref(href)
	if (id !== null) return { kind: 'doc', id }
	const github = /^github:(\d+)$/.exec(href)
	return github ? { kind: 'github', number: Number(github[1]) } : null
}
