import { createFileRoute, notFound } from '@tanstack/react-router'
import * as z from 'zod'

import languages from '@/lib/languages'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	messageTagLinksCollection,
	messageTagsCollection,
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { publicProfilesCollection } from '@/features/profile/collections'

// Exported so the lazy component half can reuse them (tab parsing + the
// search-param type) without redefining the schema.
export const TabSchema = z.enum(['all', 'cards', 'sets', 'requests'])

export const BrowseSearchSchema = z.object({
	tab: TabSchema.optional(),
	tag: z.string().optional(),
	level: z.coerce.number().int().min(1).max(5).optional(),
})

export type BrowseSearch = z.infer<typeof BrowseSearchSchema>

export const Route = createFileRoute('/_user/browse/$lang')({
	validateSearch: BrowseSearchSchema,
	staticData: {
		search: 'content',
		appnav: [['/browse', '/browse/charts']],
		titleBar: ({ params }) => ({
			title: `Browse ${languages[params.lang] ?? params.lang}`,
			subtitle: 'Discover cards, sets, and discussions',
			onBackClick: '/browse',
		}),
	},
	beforeLoad: ({ params: { lang } }) => {
		if (!languages[lang]) throw notFound()
	},
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			// phrasesFull inner-joins public profiles, so without this the New
			// Cards grid (and request author avatars) would render empty.
			publicProfilesCollection.preload(),
			phraseRequestsCollection.preload(),
			commentsCollection.preload(),
			commentPhraseLinksCollection.preload(),
			// Request-tag "sets" join requests → their tag links → answer phrases.
			messageTagsCollection.preload(),
			messageTagLinksCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(
				cardsCollection.preload(),
				decksCollection.preload(),
				phraseRequestUpvotesCollection.preload()
			)
		}
		await Promise.all(preloads)
	},
})
