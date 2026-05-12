import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import languages from '@/lib/languages'
import {
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
} from '@/features/comments/collections'
import { toastNeutral } from '@/components/ui/sonner'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	validateSearch: z.object({
		show: z.enum(['thread', 'answers-only', 'request-only']).optional(),
		focus: z.string().uuid().optional().catch(undefined),
		mode: z.enum(['reply', 'edit', 'comment', 'search']).optional(),
		attaching: z.boolean().optional(),
	}),
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: { title: `${languages[lang]} Request` },
		appnav: [],
	}),
	loader: async ({ context, location, cause }) => {
		const preloads: Promise<unknown>[] = [
			commentsCollection.preload(),
			commentPhraseLinksCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(commentUpvotesCollection.preload())
		}
		await Promise.all(preloads)
		const rawFocus = new URLSearchParams(location.searchStr).get('focus')
		if (rawFocus && !z.string().uuid().safeParse(rawFocus).success) {
			if (cause === 'preload')
				console.error('Malformed focus param in preload link:', rawFocus)
			else toastNeutral("Couldn't find that comment")
		}
	},
})
