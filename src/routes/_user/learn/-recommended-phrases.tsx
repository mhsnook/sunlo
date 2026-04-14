import { useRef } from 'react'
import { Brain, Carrot, LucideIcon, TrendingUp } from 'lucide-react'

import type { pids } from '@/types/main'
import languages from '@/lib/languages'
import { CompositePids, useCompositePids } from '@/hooks/composite-pids'
import { useDeckPids } from '@/features/deck/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'

type PhraseSectionProps = {
	description: string
	pids: pids
	Icon: LucideIcon
}

const PhraseSection = ({ description, pids, Icon }: PhraseSectionProps) => {
	return (
		<div className="space-y-4 rounded p-4 shadow">
			<p className="my-1 flex flex-row justify-between text-lg">
				{description}
				<Icon className="inline size-6" />
			</p>
			<div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
				{pids.map((pid) => (
					<PhraseTinyCard key={pid} pid={pid} />
				))}
			</div>
		</div>
	)
}

export function RecommendedPhrasesCard({ lang }: { lang: string }) {
	const recommendations = useCompositePids(lang)
	const { data: deckPids } = useDeckPids(lang)

	// Snapshot top8 on first load so the ordering stays stable when
	// the user bookmarks cards (which changes deckPids reactively).
	// We still live-filter against the current deckPids below so that
	// newly-added cards disappear from the list instead of lingering.
	const stableTop8 = useRef<CompositePids['top8'] | null>(null)
	if (stableTop8.current === null && recommendations) {
		stableTop8.current = recommendations.top8
	}

	if (!stableTop8.current || !deckPids) return null

	const deckSet = new Set(deckPids.all)
	const popular = stableTop8.current.popular
		.filter((pid) => !deckSet.has(pid))
		.slice(0, 4)
	const newest = stableTop8.current.newest
		.filter((pid) => !deckSet.has(pid))
		.slice(0, 4)
	const easiest = stableTop8.current.easiest
		.filter((pid) => !deckSet.has(pid))
		.slice(0, 4)

	if (popular.length === 0 && newest.length === 0 && easiest.length === 0)
		return null

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recommended For You</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{popular.length > 0 && (
					<PhraseSection
						description={`Popular among all ${languages[lang]} learners`}
						pids={popular}
						Icon={TrendingUp}
					/>
				)}
				{newest.length > 0 && (
					<PhraseSection description="Newly added" pids={newest} Icon={Brain} />
				)}
				{easiest.length > 0 && (
					<PhraseSection
						description="Broaden your vocabulary"
						pids={easiest}
						Icon={Carrot}
					/>
				)}
			</CardContent>
		</Card>
	)
}
