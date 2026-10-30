import {
	isThreadPlace,
	type AgentStatusType,
	type CrewKey,
	type MessagePlaceType,
} from '../../shared/crew'

// An agent can have two runs at once: one in its main conversation, and one
// in the conversation of a side-thread it helps in. A run is the thread's
// first message id for a side-thread run, and null for the main run.
export type RunKey = string | null

// The status an agent should show, given when the first of its running runs
// started (null when none is running), or null when its status already
// shows that.
export function settledStatus(
	status: AgentStatusType | undefined,
	since: string | null,
	at: string
): AgentStatusType | null {
	if (since) {
		return status?.state === 'working' && status.since === since
			? null
			: { state: 'working', since }
	}
	return status?.state === 'idle' ? null : { state: 'idle', since: at }
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
