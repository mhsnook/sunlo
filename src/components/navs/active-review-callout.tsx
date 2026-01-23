import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Rocket } from 'lucide-react'
import { useDecks } from '@/hooks/use-deck'
import { useActiveReviewRemaining } from '@/hooks/use-reviews'
import { hoursUntil4am, todayString } from '@/lib/utils'
import { useSidebar } from '@/components/ui/sidebar'
import languages from '@/lib/languages'

interface ActiveReview {
	lang: string
	remaining: number
}

function ReviewChecker({
	lang,
	onActive,
}: {
	lang: string
	onActive: (lang: string, remaining: number | null) => void
}) {
	const remaining = useActiveReviewRemaining(lang, todayString())

	useEffect(() => {
		onActive(lang, remaining)
	}, [lang, remaining, onActive])

	return null
}

function ReviewRemainingDisplay({ lang, remaining }: ActiveReview) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-xs font-medium">{languages[lang]}</span>
			<span className="text-primary text-xs font-bold">{remaining} left</span>
		</div>
	)
}

export function ActiveReviewCallout() {
	const { data: decks } = useDecks()
	const { setClosedMobile, open } = useSidebar()
	const hoursLeft = hoursUntil4am()
	const [activeReviews, setActiveReviews] = useState<Map<string, number>>(
		new Map()
	)

	// Get all deck languages to check for active reviews
	const deckLangs = decks?.filter((d) => !d.archived).map((d) => d.lang) ?? []

	const handleActive = (lang: string, remaining: number | null) => {
		setActiveReviews((prev) => {
			const next = new Map(prev)
			if (remaining && remaining > 0) {
				next.set(lang, remaining)
			} else {
				next.delete(lang)
			}
			return next
		})
	}

	if (deckLangs.length === 0) return null

	const activeList = Array.from(activeReviews.entries()).map(
		([lang, remaining]) => ({ lang, remaining })
	)

	return (
		<>
			{/* Hidden components that check each language for active reviews */}
			{deckLangs.map((lang) => (
				<ReviewChecker key={lang} lang={lang} onActive={handleActive} />
			))}

			{activeList.length > 0 && (
				<CalloutContent
					activeReviews={activeList}
					hoursLeft={hoursLeft}
					setClosedMobile={setClosedMobile}
					sidebarOpen={open}
				/>
			)}
		</>
	)
}

function CalloutContent({
	activeReviews,
	hoursLeft,
	setClosedMobile,
	sidebarOpen,
}: {
	activeReviews: Array<ActiveReview>
	hoursLeft: number
	setClosedMobile: () => void
	sidebarOpen: boolean
}) {
	// If sidebar is collapsed, show a compact icon
	if (!sidebarOpen) {
		return (
			<Link
				to="/learn/$lang/review"
				params={{ lang: activeReviews[0].lang }}
				onClick={setClosedMobile}
				className="bg-primary/20 hover:bg-primary/30 text-primary mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
				title="Active review in progress"
			>
				<Rocket className="h-4 w-4" />
			</Link>
		)
	}

	return (
		<div className="bg-primary/10 border-primary/20 mx-2 mb-2 rounded-xl border p-3">
			<Link
				to="/learn/$lang/review"
				params={{ lang: activeReviews[0].lang }}
				onClick={setClosedMobile}
				className="group flex items-center gap-2"
			>
				<div className="bg-primary/20 group-hover:bg-primary/30 rounded-lg p-1.5 transition-colors">
					<Rocket className="text-primary h-4 w-4" />
				</div>
				<span className="text-sm font-semibold">Finish your review</span>
			</Link>

			<div className="mt-2 space-y-1">
				{activeReviews.map(({ lang, remaining }) => (
					<ReviewRemainingDisplay
						key={lang}
						lang={lang}
						remaining={remaining}
					/>
				))}
			</div>

			<p className="text-muted-foreground mt-2 text-[10px]">
				Day resets at 4am ({hoursLeft}h)
			</p>
		</div>
	)
}
