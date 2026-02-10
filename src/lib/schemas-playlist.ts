import * as z from 'zod'
import { LangSchema } from './schemas'

export const PlaylistPhraseLinkSchema = z.object({
	id: z.string().uuid(),
	uid: z.string().uuid(),
	phrase_id: z.string().uuid(),
	playlist_id: z.string().uuid(),
	order: z.number().nullable(),
	href: z.string().nullable(),
	created_at: z.string(),
})

export type PlaylistPhraseLinkType = z.infer<typeof PlaylistPhraseLinkSchema>

export const PhrasePlaylistSchema = z.object({
	id: z.string().uuid(),
	uid: z.string().uuid(),
	description: z.string().nullable(),
	href: z.string().nullable(),
	cover_image_path: z.string().nullable().optional(),
	title: z.string(),
	created_at: z.string(),
	lang: LangSchema,
	upvote_count: z.number().default(0),
	deleted: z.boolean().default(false),
	updated_at: z.string().nullable().optional(),
})

export type PhrasePlaylistType = z.infer<typeof PhrasePlaylistSchema>

export const PhrasePlaylistUpvoteSchema = z.object({
	playlist_id: z.string().uuid(),
})

export type PhrasePlaylistUpvoteType = z.infer<
	typeof PhrasePlaylistUpvoteSchema
>

// Preprocess empty/whitespace strings to null so blank inputs are treated as "no URL"
const emptyToNull = (v: unknown) =>
	typeof v === 'string' && v.trim() === '' ? null : v

// Validates as a URL on input, but coerces empty strings to null first
const urlFieldInsert = z.preprocess(
	emptyToNull,
	z.string().url('Please enter a valid URL').nullable()
)

// this is for links that are included as part of the larger create-playlist item
export const PlaylistPhraseLinkIncludedInsertSchema = z.object({
	phrase_id: z.string().uuid(),
	// for now the order will be assigned by the client's submit function
	// rather than set by the user, but it will still be required by the RPC function
	// order: z.number().optional(),
	// the link to the timestamp in the external resource
	href: urlFieldInsert.optional(),
})

export type PlaylistPhraseLinkIncludedInsertType = z.infer<
	typeof PlaylistPhraseLinkIncludedInsertSchema
>

export const PhrasePlaylistInsertSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	href: urlFieldInsert,
	cover_image_path: z.string().nullable().optional(),
	phrases: z.array(PlaylistPhraseLinkIncludedInsertSchema),
})

export type PhrasePlaylistInsertType = z.infer<
	typeof PhrasePlaylistInsertSchema
>

/** Returns an error message if the string is not a valid URL, or null if valid/empty */
export function validateUrl(value: string): string | null {
	if (value.trim() === '') return null
	const result = z.string().url().safeParse(value)
	return result.success ? null : 'Please enter a valid URL'
}
