import languages from '@/lib/languages'
import { useProfile } from '@/hooks/use-profile'
import { pids } from '@/types/main'
import { Brain, Carrot, LucideIcon, Sparkles, TrendingUp } from 'lucide-react'
import {
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer'

import { TapCardToSelect } from '@/components/cards/tap-to-select'
import { useCallback } from 'react'

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
	const { data: profile } = useProfile()
	if (!profile)
		throw new Error(
			'Profile should be here on first render, but it is not showing up'
		)
	// Toggle card selection
	const toggleCardSelection = useCallback(
		(pid1: string) => {
			const updatedRecs =
				!algoRecsSelected.includes(pid1) ?
					[...algoRecsSelected, pid1]
				:	algoRecsSelected.filter((pid2) => pid1 !== pid2)
			setAlgoRecsSelected(updatedRecs)
		},
		[algoRecsSelected, setAlgoRecsSelected]
	)
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
											return (
												<TapCardToSelect
													key={pid}
													toggleCardSelection={toggleCardSelection}
													isSelected={algoRecsSelected.includes(pid)}
													pid={pid}
													lang={lang}
												/>
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
