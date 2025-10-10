import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { z } from 'zod'

const publicProfileSchema = z.object({
	uid: z.string().uuid(),
	username: z.string().nullable(),
	avatar_path: z.string().nullable(),
})

const metaPhraseRequestSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string().datetime(),
	requester_uid: z.string().uuid(),
	lang: z.string(),
	text: z.string(),
})

const ELECTRIC_SHAPE_URL = 'http://localhost:3000/v1/shape'

export const publicProfilesCollection = createCollection(
	electricCollectionOptions({
		id: 'public_profiles',
		shapeOptions: {
			url: ELECTRIC_SHAPE_URL,
			params: {
				table: 'public_profile',
			},
		},
		getKey: (item) => item.uid,
		schema: publicProfileSchema,
	})
)

export const phraseRequestsCollection = createCollection(
	electricCollectionOptions({
		id: 'meta_phrase_requests',
		shapeOptions: {
			url: ELECTRIC_SHAPE_URL,
			params: {
				table: 'meta_phrase_request',
			},
		},
		getKey: (item) => item.id,
		schema: metaPhraseRequestSchema,
	})
)

export const collections = {
	publicProfiles: publicProfilesCollection,
	phraseRequests: phraseRequestsCollection,
}
