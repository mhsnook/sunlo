import { createLazyFileRoute } from '@tanstack/react-router'
import { SearchPage } from './-search-page'
import { ScoreBreakdown } from './-score-breakdown'

// Hidden diagnostic route — same UI as /search but injects ScoreBreakdown
// into each result's right column via SearchPage's rowExtras render prop.
// ScoreBreakdown lives in its own file so it ends up in this route's chunk
// only — /search never ships it. Access by typing /search/test (no nav).
export const Route = createLazyFileRoute('/_user/search/test')({
	component: () => (
		<SearchPage
			rowExtras={(item) => (
				<ScoreBreakdown
					semantic={item.semanticScore}
					trigram={item.trigramScore}
				/>
			)}
		/>
	),
})
