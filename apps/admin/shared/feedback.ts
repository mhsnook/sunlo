import { z } from 'zod'
import { roomKeys, type RoomKey } from './crew'

// Feedback that people send from the app's /feedback page. The rows live in
// Postgres (public.feedback); the crew's triage of each one lives in the
// CrewRoom Durable Object, keyed by the row's id, because admin_reader
// cannot write. Imported by the Worker and by the app.

export const feedbackKinds = ['bug', 'feature', 'library'] as const
export type FeedbackKind = (typeof feedbackKinds)[number]

export const feedbackKindLabels: Record<FeedbackKind, string> = {
	bug: 'Bug',
	feature: 'Feature idea',
	library: 'Library need',
}

// The room that triages a kind of feedback unless an agent hands it on.
export const feedbackRoomOf: Record<FeedbackKind, RoomKey> = {
	bug: 'product',
	feature: 'product',
	library: 'library',
}

export const feedbackOutcomes = [
	'filed',
	'planned',
	'duplicate',
	'for_admin',
	'not_planned',
	'spam',
] as const
export type FeedbackOutcome = (typeof feedbackOutcomes)[number]

// Shown to the admin, and in the triage tool's description for the agents.
export const feedbackOutcomeLabels: Record<FeedbackOutcome, string> = {
	filed: 'Filed on GitHub',
	planned: 'Planned',
	duplicate: 'Duplicate',
	for_admin: 'For the admin',
	not_planned: 'Not planned',
	spam: 'Spam',
}

export const FeedbackTriageSchema = z.object({
	feedback_id: z.string(),
	outcome: z.enum(feedbackOutcomes),
	room: z.enum(roomKeys),
	issue: z.number().int().nullable(),
	note: z.string().nullable(),
	agent: z.string(),
	at: z.string(),
})
export type FeedbackTriageType = z.infer<typeof FeedbackTriageSchema>

export const FeedbackItemSchema = z.object({
	id: z.string(),
	created_at: z.string(),
	kind: z.enum(feedbackKinds),
	message: z.string(),
	lang: z.string().nullable(),
	page_url: z.string().nullable(),
	// Null when the sender was signed out, or has not picked a username.
	username: z.string().nullable(),
	signed_in: z.boolean(),
	// Null for the crew, which sees only left_email.
	contact_email: z.string().nullable(),
	left_email: z.boolean(),
	triage: FeedbackTriageSchema.nullable(),
})
export type FeedbackItemType = z.infer<typeof FeedbackItemSchema>

export const FeedbackListSchema = z.object({
	items: z.array(FeedbackItemSchema),
	untriaged: z.number().int(),
})
export type FeedbackListType = z.infer<typeof FeedbackListSchema>
