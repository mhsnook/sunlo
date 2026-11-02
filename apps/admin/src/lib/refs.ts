// What a link in an agent's text points at inside the app: a room's document,
// or an issue or pull request on GitHub. remarkCrew turns a bare "#854" into
// a `github:854` link, so both kinds reach CrewText as links.
export type RefTarget =
	| { kind: 'doc'; id: number }
	| { kind: 'github'; number: number }

export const githubHref = (number: number) => `github:${number}`

export function parseRef(href: string): RefTarget | null {
	const match = /^(doc|github):(\d+)$/i.exec(href)
	if (!match) return null
	const value = Number(match[2])
	return match[1].toLowerCase() === 'doc'
		? { kind: 'doc', id: value }
		: { kind: 'github', number: value }
}
