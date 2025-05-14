import languages from '@/lib/languages'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { useProfile } from '@/lib/use-profile'
import { pids } from '@/types/main'
import {
	Brain,
	Carrot,
	CheckCircle,
	LucideIcon,
	Sparkles,
	TrendingUp,
} from 'lucide-react'
import {
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from '../ui/drawer'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card'
import { Badge } from '../ui/badge'

export type AlgoRecsFiltersEnum = 'popular' | 'easiest' | 'newest'
export type AlgoRecsObject = Record<AlgoRecsFiltersEnum, pids>

export function SelectPhrasesToAddToReview({
	lang,
	algoRecsSelected,
	setAlgoRecsSelected,
	algoRecsFiltered,
	// countOfCardsDesired,
}: {
	lang: string
	algoRecsSelected: pids
	setAlgoRecsSelected: (recs: pids) => void
	algoRecsFiltered: AlgoRecsObject
	// countOfCardsDesired: number
}) {
	const res = useDeckPidsAndRecs(lang)
	if (!res)
		throw new Error(
			'Unable to grab the collated deck pids and filtered phrases'
		)
	const phrasesMapFiltered = res.phrasesMapFiltered
	const { data: profile } = useProfile()
	if (!profile)
		throw new Error(
			'Profile should be here on first render, but it is not showing up'
		)
	// Toggle card selection
	const toggleCardSelection = (pid1: string) => {
		const updatedRecs =
			algoRecsSelected.indexOf(pid1) === -1 ?
				[...algoRecsSelected, pid1]
			:	algoRecsSelected.filter((pid2) => pid1 !== pid2)
		setAlgoRecsSelected(updatedRecs)
	}
	const sections: {
		key: AlgoRecsFiltersEnum
		description: string
		Icon: LucideIcon
	}[] = [
		{
			key: 'popular',
			description: `Popular among all ${languages[lang]} learners`,
			Icon: TrendingUp,
		},
		{
			key: 'easiest',
			description: `Broaden your vocabulary`,
			Icon: Carrot,
		},
		{
			key: 'newest',
			description: `Newly added`,
			Icon: Brain,
		},
	]

	return (
		<DrawerContent aria-describedby="drawer-description">
			<div className="@container relative mx-auto w-full max-w-prose overflow-y-auto px-1 pb-10">
				<DrawerHeader className="bg-background sticky top-0">
					<DrawerTitle className="sticky top-0 flex items-center gap-2 text-xl">
						<Sparkles className="h-5 w-5 text-purple-500" />
						Recommended for you ({algoRecsSelected.length} selected)
					</DrawerTitle>
				</DrawerHeader>
				<DrawerDescription className="">
					Review and select which recommended cards you want to include in your
					session
				</DrawerDescription>
				<div className="my-6 space-y-6">
					{sections.map((s) => {
						return (
							<div key={s.key}>
								<p className="my-4 text-lg">
									<s.Icon className="inline size-6" /> {s.description}
								</p>
								<div className="grid gap-3 @lg:grid-cols-2">
									{algoRecsFiltered[s.key].length > 0 ?
										algoRecsFiltered[s.key].map((pid) => {
											const selected = algoRecsSelected.indexOf(pid) > -1
											const phrase = phrasesMapFiltered[pid]
											// console.log(`mapping the algo recs`, phrase)

											return (
												<Card
													onClick={() => toggleCardSelection(pid)}
													key={pid}
													className={`hover:bg-primary/20 cursor-pointer border-1 transition-all ${selected ? 'border-primary bg-primary/10' : ''}`}
												>
													<CardHeader className="p-3 pb-0">
														<CardTitle className="text-base">
															{phrase.text}
														</CardTitle>
														<CardDescription>
															{phrase.translations[0].text}
														</CardDescription>
													</CardHeader>
													<CardFooter className="flex justify-end p-3 pt-0">
														<Badge
															variant={selected ? 'default' : 'outline'}
															className="grid grid-cols-1 grid-rows-1 place-items-center font-normal [grid-template-areas:'stack']"
														>
															<span
																className={`flex flex-row items-center gap-1 [grid-area:stack] ${selected ? '' : 'invisible'}`}
															>
																<CheckCircle className="me-1 h-3 w-3" />
																Selected
															</span>
															<span
																className={`[grid-area:stack] ${selected ? 'invisible' : ''}`}
															>
																Tap to select
															</span>
														</Badge>
													</CardFooter>
												</Card>
											)
										})
									:	<p className="text-muted-foreground">
											Sorry, all out of recommendations today
										</p>
									}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</DrawerContent>
	)
}
