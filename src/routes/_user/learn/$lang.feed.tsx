import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import languages from '@/lib/languages'

const SearchSchema = z.object({
	feed: z.enum(['newest', 'friends', 'popular']).optional(),
	filter_type: z.enum(['request', 'playlist', 'phrase']).optional(),
})

export const Route = createFileRoute('/_user/learn/$lang/feed')({
	validateSearch: SearchSchema,
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `${languages[lang]} Feed`,
			onBackClick: '/learn',
		},
	}),
})
