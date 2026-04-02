import * as z from 'zod'

export const NotificationTypeSchema = z.enum([
	'request_commented',
	'comment_replied',
	'phrase_translated',
	'phrase_referenced',
	'request_upvoted',
	'change_suggested',
	'phrase_commented',
	'phrase_comment_replied',
])

export const NotificationSchema = z.object({
	id: z.string().uuid(),
	uid: z.string().uuid(),
	type: NotificationTypeSchema,
	actor_uid: z.string().uuid(),
	request_id: z.string().uuid().nullable(),
	comment_id: z.string().uuid().nullable(),
	phrase_id: z.string().uuid().nullable(),
	phrase_comment_id: z.string().uuid().nullable(),
	read_at: z.string().nullable(),
	created_at: z.string(),
})

export type NotificationType = z.infer<typeof NotificationSchema>
export type NotificationTypeEnum = z.infer<typeof NotificationTypeSchema>
