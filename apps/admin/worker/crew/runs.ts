import {
	isThreadPlace,
	type CrewKey,
	type MessagePlaceType,
} from '../../shared/crew'

// An agent can have two runs at once: one in its main conversation, and one
// in the conversation of a side-thread it helps in. A run is the thread's
// first message id for a side-thread run, and null for the main run.
export type RunKey = string | null

export type EditRow = { run: RunKey; what: string; at: string }

// The edits one run made since it started, oldest first.
export function runEdits(
	edits: Array<EditRow>,
	run: { thread: RunKey; since: string }
): Array<string> {
	return edits
		.filter((edit) => edit.run === run.thread && edit.at >= run.since)
		.toSorted((a, b) => a.at.localeCompare(b.at))
		.map((edit) => edit.what)
}

// A message the agent wrote, and for a side-thread reply, who asked in that
// thread.
export type PostRow = { place: MessagePlaceType; threadAsker: string | null }

// Whether the agent's main run posted any of these messages. A reply in a
// side-thread the agent was asked in came from that thread's own run; a
// reply in a side-thread it asked in came from its main run, which is where
// the helper's replies reach it.
export function mainRunPosted(agent: CrewKey, posts: Array<PostRow>) {
	return posts.some(
		(post) => !isThreadPlace(post.place) || post.threadAsker === agent
	)
}
