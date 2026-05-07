import { createLazyFileRoute } from '@tanstack/react-router'
import { SearchPage } from './-search-page'

// Hidden diagnostic route — same UI as /search but renders the score
// breakdown (Ω semantic, Δ trigram, Σ combined) on each result row so the
// blending formula can be tuned by eyeballing real queries. Not in nav;
// access by typing /search/test.
export const Route = createLazyFileRoute('/_user/search/test')({
	component: () => <SearchPage diagnostic />,
})
