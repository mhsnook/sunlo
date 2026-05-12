import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

const SearchParams = z.object({
	q: z.string().optional(),
	langs: z.string().optional(),
})

// /search is a thin layout — actual UI lives in -search-page.tsx
// (a non-route component, `-` prefix per convention) and ships only when
// either the index route (search.index.lazy.tsx) or the diagnostic route
// (search.test.lazy.tsx) loads.
export const Route = createFileRoute('/_user/search')({
	validateSearch: SearchParams,
	beforeLoad: () => ({
		titleBar: { title: 'Search' },
		appnav: [],
		fixedHeight: true,
	}),
})
