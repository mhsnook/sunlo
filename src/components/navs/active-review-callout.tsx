import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Rocket } from 'lucide-react'
import { useDecks } from '@/hooks/use-deck'
import { useActiveReviewRemaining } from '@/hooks/use-reviews'
import { hoursUntil4am, todayString } from '@/lib/utils'
import { useSidebar } from '@/components/ui/sidebar'
import { buttonVariants } from '@/components/ui/button'
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

function ReviewRemainingLink({
	lang,
	remaining,
	onClick,
}: ActiveReview & { onClick: () => void }) {
	return (
		<Link
			to="/learn/$lang/review"
			params={{ lang }}
			onClick={onClick}
			className="group flex items-center justify-between"
		>
			<span className="text-xs font-medium group-hover:underline">
				{languages[lang]}
			</span>
			<span className="text-primary group-hover:text-primary/80 text-xs font-bold">
				{remaining} left
			</span>
		</Link>
	)
}

export function ActiveReviewCallout({
	currentLang,
}: {
	currentLang?: string | number
}) {
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

	// If in a language context, only show that language's review
	const lang = currentLang ? String(currentLang) : undefined
	const activeList =
		lang ?
			activeReviews.has(lang) ?
				[{ lang, remaining: activeReviews.get(lang)! }]
			:	[]
		:	Array.from(activeReviews.entries()).map(([lang, remaining]) => ({
				lang,
				remaining,
			}))

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
					singleLanguageMode={!!lang}
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
	singleLanguageMode,
}: {
	activeReviews: Array<ActiveReview>
	hoursLeft: number
	setClosedMobile: () => void
	sidebarOpen: boolean
	singleLanguageMode: boolean
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

	// Single language mode: simpler UI with just a button
	if (singleLanguageMode) {
		const { lang, remaining } = activeReviews[0]
		return (
			<div className="bg-primary/10 border-primary/20 mx-2 mb-2 rounded-xl border p-3">
				<div className="flex items-center gap-2">
					<div className="bg-primary/20 rounded-lg p-1.5">
						<Rocket className="text-primary h-4 w-4" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-semibold">{remaining} cards left</p>
						<p className="text-muted-foreground text-[10px]">
							Day resets at 4am ({hoursLeft}h)
						</p>
					</div>
				</div>
				<Link
					to="/learn/$lang/review"
					params={{ lang }}
					onClick={setClosedMobile}
					className={buttonVariants({
						variant: 'default',
						size: 'sm',
						className: 'mt-2 w-full',
					})}
				>
					Continue review
				</Link>
			</div>
		)
	}

	// Multi-language mode: show all with clickable links
	return (
		<div className="bg-primary/10 border-primary/20 mx-2 mb-2 rounded-xl border p-3">
			<div className="flex items-center gap-2">
				<div className="bg-primary/20 rounded-lg p-1.5">
					<Rocket className="text-primary h-4 w-4" />
				</div>
				<span className="text-sm font-semibold">Finish your review</span>
			</div>

			<div className="mt-2 space-y-1">
				{activeReviews.map(({ lang, remaining }) => (
					<ReviewRemainingLink
						key={lang}
						lang={lang}
						remaining={remaining}
						onClick={setClosedMobile}
					/>
				))}
			</div>

			<p className="text-muted-foreground mt-2 text-[10px]">
				Day resets at 4am ({hoursLeft}h)
			</p>
		</div>
	)
}
