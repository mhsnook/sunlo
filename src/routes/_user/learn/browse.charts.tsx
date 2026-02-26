import type { CSSProperties } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BarChart3 } from 'lucide-react'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import {
	LanguageComparisonChart,
	DifficultyPopularityScatter,
	TagTreemap,
	DifficultyHistogram,
	LibrarySummaryStats,
	useLanguageSelector,
} from '@/components/library-charts'

export const Route = createFileRoute('/_user/learn/browse/charts')({
	component: ChartsPage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function ChartsPage() {
	const { availableLanguages, activeLang, setSelectedLang } =
		useLanguageSelector()

	return (
		<main style={style} className="space-y-10 pb-16" data-testid="library-page">
			{/* Summary Stats */}
			<section>
				<h2 className="mb-4 text-2xl font-bold">Library at a Glance</h2>
				<LibrarySummaryStats />
			</section>

			{/* Language Comparison */}
			<Card>
				<CardHeader>
					<h2 className="text-xl font-bold">Languages by Content</h2>
					<p className="text-muted-foreground text-sm">
						Comparing phrase counts and active learners across languages
					</p>
				</CardHeader>
				<CardContent>
					<LanguageComparisonChart />
				</CardContent>
			</Card>

			{/* Language Selector for per-language charts */}
			{availableLanguages.length > 0 && (
				<div className="flex flex-col items-start gap-2 @md:flex-row @md:items-center">
					<span className="text-muted-foreground text-sm font-medium">
						Explore data for:
					</span>
					<Select
						value={activeLang}
						onValueChange={(value) => {
							if (value !== null) setSelectedLang(value)
						}}
					>
						<SelectTrigger className="w-60 border">
							<SelectValue placeholder="Select a language" />
						</SelectTrigger>
						<SelectContent>
							{availableLanguages.map((lang) => (
								<SelectItem key={lang.lang} value={lang.lang}>
									{lang.name} ({lang.phrases_to_learn ?? 0} phrases)
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{/* Per-language Charts */}
			{activeLang && (
				<div className="space-y-8">
					{/* Tag Treemap */}
					<Card>
						<CardHeader>
							<h2 className="text-xl font-bold">Topics & Tags</h2>
							<p className="text-muted-foreground text-sm">
								What subjects are covered in this language's library? Larger
								blocks = more phrases tagged with that topic.
							</p>
						</CardHeader>
						<CardContent>
							<TagTreemap lang={activeLang} />
						</CardContent>
					</Card>

					{/* Difficulty Distribution */}
					<Card>
						<CardHeader>
							<h2 className="text-xl font-bold">Difficulty Distribution</h2>
							<p className="text-muted-foreground text-sm">
								How are phrases spread across difficulty levels? Based on
								aggregate FSRS review data from all learners.
							</p>
						</CardHeader>
						<CardContent>
							<DifficultyHistogram lang={activeLang} />
						</CardContent>
					</Card>

					{/* Difficulty vs Popularity Scatter */}
					<Card>
						<CardHeader>
							<h2 className="text-xl font-bold">Difficulty vs Popularity</h2>
							<p className="text-muted-foreground text-sm">
								Each bubble is a phrase. X-axis shows difficulty (FSRS), Y-axis
								shows learner count, and bubble size reflects memory stability.
								Hover for details.
							</p>
						</CardHeader>
						<CardContent>
							<DifficultyPopularityScatter lang={activeLang} />
						</CardContent>
					</Card>
				</div>
			)}

			{/* Empty state */}
			{!availableLanguages.length && (
				<div className="py-12 text-center">
					<BarChart3 className="text-muted-foreground mx-auto mb-4 size-12" />
					<p className="text-muted-foreground text-lg">
						No library data available yet.
					</p>
					<Link
						to="/learn/browse"
						className={buttonVariants({ variant: 'soft' })}
					>
						Browse Languages
					</Link>
				</div>
			)}
		</main>
	)
}
