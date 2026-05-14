import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import languages from '@/lib/languages'
import {
	commentsQuery,
	commentPhraseLinksQuery,
	commentUpvotesQuery,
} from '@/features/comments/queries'
import { queryClient } from '@/lib/query-client'

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
			queryClient.ensureQueryData(commentsQuery),
			queryClient.ensureQueryData(commentPhraseLinksQuery),
		]
		if (context.auth.isAuth) {
			preloads.push(queryClient.ensureQueryData(commentUpvotesQuery))
		}
		await Promise.all(preloads)
		const rawFocus = new URLSearchParams(location.searchStr).get('focus')
		if (rawFocus && !z.string().uuid().safeParse(rawFocus).success) {
			if (cause === 'preload')
				console.error('Malformed focus param in preload link:', rawFocus)
			else {
				const { toastNeutral } = await import('@/components/ui/sonner')
				toastNeutral("Couldn't find that comment")
			}
		}
	},
})
