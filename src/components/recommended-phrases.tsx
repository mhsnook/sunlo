import languages from '@/lib/languages'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ProcessedPids } from '@/lib/process-pids'
import { Brain, Carrot, LucideIcon, TrendingUp } from 'lucide-react'
import { LangOnlyComponentProps, pids } from '@/types/main'
import { useLanguagePhrasesMap } from '@/lib/use-language'
import { PhraseCard } from './phrase-card'

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
	const { data: phrasesMap } = useLanguagePhrasesMap(lang)
	if (!phrasesMap) return null
	return (
		<div>
			<p className="my-1 text-lg">
				<Icon className="inline size-6" /> {description}
			</p>
			{pids?.length > 0 ?
				<div className="flex flex-row flex-wrap gap-2">
					{pids.map((pid) => {
						return !(pid in phrasesMap) ? null : (
								<PhraseCard key={pid} phrase={phrasesMap[pid]} />
							)
					})}
				</div>
			:	<p className="text-muted-foreground">No phrases available</p>}
		</div>
	)
}

export function RecommendedPhrasesCard({
	lang,
	pids,
}: LangOnlyComponentProps & { pids: ProcessedPids }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Recommended For You</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<PhraseSection
					description={`Popular among all ${languages[lang]} learners`}
					pids={pids.recommended.popular.slice(0, 4)}
					lang={lang}
					Icon={TrendingUp}
				/>
				<PhraseSection
					description="Newly added"
					pids={pids.recommended.newest.slice(0, 4)}
					lang={lang}
					Icon={Brain}
				/>
				<PhraseSection
					description="Broaden your vocabulary"
					pids={pids.recommended.easiest.slice(0, 4)}
					lang={lang}
					Icon={Carrot}
				/>
			</CardContent>
		</Card>
	)
}
