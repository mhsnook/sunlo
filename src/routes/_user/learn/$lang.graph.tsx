import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import { eq } from '@tanstack/react-db'
import { phrasesCollection } from '@/lib/collections'
import PhraseGraph from '@/components/graph/phrase-graph'
import { CSSProperties } from 'react'

export const Route = createFileRoute('/_user/learn/$lang/graph')({
	component: GraphPage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function GraphPage() {
	const { lang } = Route.useParams()

	const { data: phrases } = useLiveQuery((q) =>
		q.from({ p: phrasesCollection }).where(({ p }) => eq(p.lang, lang))
	)

	return (
		<main
			className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4 p-4"
			style={style}
		>
			<div className="flex items-baseline justify-between">
				<h1 className="text-lg font-bold">Phrase Map</h1>
				<p className="text-muted-foreground text-xs">
					Explore how phrases relate by meaning
				</p>
			</div>
			<div className="min-h-0 flex-1">
				<PhraseGraph phrases={phrases ?? []} lang={lang} />
			</div>
		</main>
	)
}
