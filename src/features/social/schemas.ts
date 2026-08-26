import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'

export const FriendRequestResponseEnumSchema = z.enum([
	'accept',
	'decline',
	'cancel',
	'remove',
	'invite',
])

export type FriendRequestResponseType = z.infer<
	typeof FriendRequestResponseEnumSchema
>

export const FriendStatusEnumSchema = z.enum([
	'friends',
	'pending',
	'unconnected',
])

export const MessageTypeEnumSchema = z.enum([
	'request',
	'recommendation',
	'accepted',
	'playlist',
])

/**
 * One row of the friend-request action log, exactly as the table stores it.
 * The log is append-only and RLS-scoped to the pairs the reader belongs to, so
 * a client holds every action it is entitled to see and can fold the
 * relationship status locally — see `friendSummaries` in ./live.ts.
 *
 * `uid_less` / `uid_more` are nullable in the database but required here: they
 * are the pair key the fold groups on, and every writer fills them in. A row
 * without them would be its own relationship, invisible to both parties.
 */
export const FriendRequestActionSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	uid_by: z.string().uuid(),
	uid_for: z.string().uuid(),
	uid_less: z.string().uuid(),
	uid_more: z.string().uuid(),
	action_type: FriendRequestResponseEnumSchema,
})

export type FriendRequestActionType = z.infer<typeof FriendRequestActionSchema>

/** The status each action type leaves the pair in. The whole fold, in one table. */
export const STATUS_AFTER_ACTION: Record<
	FriendRequestResponseType,
	z.infer<typeof FriendStatusEnumSchema>
> = {
	accept: 'friends',
	invite: 'pending',
	decline: 'unconnected',
	cancel: 'unconnected',
	remove: 'unconnected',
}

/**
 * The pair's current relationship, folded from its newest action. Keyed by
 * `${uid_less}--${uid_more}`; `uid` is the other party, relative to the
 * signed-in user. Derived on the client, never fetched — though the
 * `friend_summary` view still exists, because `validate_friend_request_action`
 * reads it.
 */
export const FriendSummarySchema = z.object({
	uid: z.string().uuid(),
	uid_less: z.string().uuid(),
	uid_more: z.string().uuid(),
	status: FriendStatusEnumSchema,
	most_recent_created_at: z.string(),
	most_recent_uid_by: z.string().uuid(),
	most_recent_uid_for: z.string().uuid(),
	most_recent_action_type: FriendRequestResponseEnumSchema,
})

export type FriendSummaryType = z.infer<typeof FriendSummarySchema>

export const ChatMessageSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	sender_uid: z.string().uuid(),
	recipient_uid: z.string().uuid(),
	message_type: MessageTypeEnumSchema,
	phrase_id: z.string().uuid().nullable(),
	request_id: z.string().uuid().nullable(),
	playlist_id: z.string().uuid().nullable(),
	related_message_id: z.string().uuid().nullable(),
	lang: LangSchema,
	read_at: z.string().nullable().default(null),
})

export type ChatMessageType = z.infer<typeof ChatMessageSchema>

export type ChatMessageRelType = ChatMessageType & {
	isByMe: boolean
	friendUid: string
}
