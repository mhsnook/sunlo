import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SearchPage } from './search'

// Hidden diagnostic route — same UI as /search but renders the score
// breakdown (semantic + trigram + combined) on each phrase result so we can
// eyeball how the blending formula behaves on real queries. No nav link;
// access by typing /search/test.
export const Route = createFileRoute('/_user/search/test')({
	component: () => <SearchPage diagnostic />,
	validateSearch: z.object({
		q: z.string().optional(),
		langs: z.string().optional(),
		tags: z.string().optional(),
	}),
	beforeLoad: () => ({
		titleBar: {
			title: 'Search (diagnostic)',
		},
		appnav: [],
		fixedHeight: true,
	}),
})
