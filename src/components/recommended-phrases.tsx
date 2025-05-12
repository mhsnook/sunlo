import languages from '@/lib/languages'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { Brain, Carrot, Loader2, LucideIcon, TrendingUp } from 'lucide-react'
import { LangOnlyComponentProps, pids } from '@/types/main'
import { PhraseTinyCard } from './phrase-tiny-card'

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
	const { phrasesMapFiltered } = useDeckPidsAndRecs(lang)
	if (!phrasesMapFiltered) return null
	return (
		<div>
			<p className="my-1 flex flex-row justify-between text-lg">
				{description}
				<Icon className="inline size-6" />
			</p>
			{pids?.length > 0 ?
				<div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
					{pids.map((pid) => {
						return !(pid in phrasesMapFiltered) ? null : (
								<PhraseTinyCard key={pid} phrase={phrasesMapFiltered[pid]} />
							)
					})}
				</div>
			:	<p className="text-muted-foreground">No phrases available</p>}
		</div>
	)
}

export function RecommendedPhrasesCard({ lang }: LangOnlyComponentProps) {
	const pids = useDeckPidsAndRecs(lang)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recommended For You</CardTitle>
			</CardHeader>
			{pids === null ?
				<Loader2 />
			:	<CardContent className="space-y-4">
					<PhraseSection
						description={`Popular among all ${languages[lang]} learners`}
						pids={pids.top8.popular.slice(0, 4)}
						lang={lang}
						Icon={TrendingUp}
					/>
					<PhraseSection
						description="Newly added"
						pids={pids.top8.newest.slice(0, 4)}
						lang={lang}
						Icon={Brain}
					/>
					<PhraseSection
						description="Broaden your vocabulary"
						pids={pids.top8.easiest.slice(0, 4)}
						lang={lang}
						Icon={Carrot}
					/>
				</CardContent>
			}
		</Card>
	)
}
