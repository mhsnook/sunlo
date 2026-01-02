import * as z from 'zod'
import { LangSchema } from './schemas'

export const PlaylistPhraseLinkSchema = z.object({
	id: z.string().uuid(),
	uid: z.string().uuid(),
	phrase_id: z.string().uuid(),
	playlist_id: z.string().uuid(),
	order: z.number().nullable(),
	href: z.string().url().nullable(),
	created_at: z.string(),
})

export type PlaylistPhraseLinkType = z.infer<typeof PlaylistPhraseLinkSchema>

export const PhrasePlaylistSchema = z.object({
	id: z.string().uuid(),
	uid: z.string().uuid(),
	description: z.string().nullable(),
	href: z.string().url().nullable(),
	title: z.string(),
	created_at: z.string(),
	lang: LangSchema,
})

export type PhrasePlaylistType = z.infer<typeof PhrasePlaylistSchema>

// this is for links that are included as part of the larger create-playlist item
export const PlaylistPhraseLinkIncludedInsertSchema = z.object({
	phrase_id: z.string().uuid(),
	// for now the order will be assigned by the client's submit function
	// rather than set by the user, but it will still be required by the RPC function
	// order: z.number().optional(),
	// the link to the timestamp in the external resource
	href: z.string().url().nullable().optional(),
})

export type PlaylistPhraseLinkIncludedInsertType = z.infer<
	typeof PlaylistPhraseLinkIncludedInsertSchema
>

export const PhrasePlaylistInsertSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	href: z.string().url().nullable(),
	phrases: z.array(PlaylistPhraseLinkIncludedInsertSchema),
})

export type PhrasePlaylistInsertType = z.infer<
	typeof PhrasePlaylistInsertSchema
>
