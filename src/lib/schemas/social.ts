import * as z from 'zod'
import { LangSchema } from './shared'

export const FriendRequestResponseEnumSchema = z.enum([
	'accept',
	'decline',
	'cancel',
	'remove',
	'invite',
])

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
