import languages from '@/lib/languages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompositePids } from '@/hooks/composite-pids'
import { Brain, Carrot, LucideIcon, TrendingUp } from 'lucide-react'
import { LangOnlyComponentProps, pids } from '@/types/main'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { Link } from '@tanstack/react-router'

type PhraseSectionProps = {
	description: string
	pids: pids
	lang: string
	Icon: LucideIcon
}

const PhraseSection = ({
	description,
	pids,
	lang,
	Icon,
}: PhraseSectionProps) => {
	return (
		<div className="space-y-4 rounded p-4 shadow">
			<p className="my-1 flex flex-row justify-between text-lg">
				{description}
				<Icon className="inline size-6" />
			</p>
			{pids?.length > 0 ?
				<div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
					{pids.map((pid) => (
						<PhraseTinyCard key={pid} pid={pid} lang={lang} />
					))}
				</div>
			:	<p className="text-muted-foreground">No recommendations available</p>}
		</div>
	)
}

export function RecommendedPhrasesCard({ lang }: LangOnlyComponentProps) {
	const recommendations = useCompositePids(lang)

	if (!recommendations) return null

	const hasRecommendations =
		recommendations.top8.popular.length > 0 ||
		recommendations.top8.newest.length > 0 ||
		recommendations.top8.easiest.length > 0

	return !hasRecommendations ?
			<p className="text-muted-foreground text-sm italic">
				There are no smart recommendations for you at this time. Check back
				later or consider{' '}
				<Link className="s-link-muted" to="/learn/$lang/requests/new">
					requesting a phrase
				</Link>
				.
			</p>
		:	<Card>
				<CardHeader>
					<CardTitle>Recommended For You</CardTitle>
				</CardHeader>

				<CardContent className="space-y-4">
					<PhraseSection
						description={`Popular among all ${languages[lang]} learners`}
						pids={recommendations.top8.popular.slice(0, 4)}
						lang={lang}
						Icon={TrendingUp}
					/>
					<PhraseSection
						description="Newly added"
						pids={recommendations.top8.newest.slice(0, 4)}
						lang={lang}
						Icon={Brain}
					/>
					<PhraseSection
						description="Broaden your vocabulary"
						pids={recommendations.top8.easiest.slice(0, 4)}
						lang={lang}
						Icon={Carrot}
					/>
				</CardContent>
			</Card>
}
