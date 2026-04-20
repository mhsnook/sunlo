import type { pids } from '@/types/main'

import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toastSuccess } from '@/components/ui/sonner'
import { toManifestEntry, type ManifestEntry } from '@/features/review/manifest'
import { directionsForPhrase } from '@/features/deck/card-directions'
import { useDeckCards } from '@/features/deck/hooks'
import { isDueCard } from '@/features/deck/is-due-card'
import { phrasesCollection } from '@/features/phrases/collections'
import {
	BookOpen,
	CalendarClock,
	MessageSquare,
	MessageSquarePlus,
	Rocket,
	Sparkles,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'
import languages from '@/lib/languages'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerTrigger } from '@/components/ui/drawer'
import Flagged from '@/components/flagged'
import {
	useInitialiseReviewStore,
	useReviewDayString,
	useReviewStage,
} from '@/features/review/store'
import { arrayDifference, arrayUnion, min0 } from '@/lib/utils'
import { useDeckMeta, useDeckPids } from '@/features/deck/hooks'
import supabase from '@/lib/supabase-client'
import {
	LanguageIsEmpty,
	LanguageFilteredIsEmpty,
} from '@/components/language-is-empty'
import { NotEnoughCards } from '@/components/review/not-enough-cards'
import { SelectPhrasesToAddToReview } from '@/components/review/select-phrases-to-add-to-review'
import { useUserId } from '@/lib/use-auth'
import { useReviewsTodayStats } from '@/features/review/hooks'
import { ContinueReview } from '@/components/review/continue-review'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { useCompositePids } from '@/hooks/composite-pids'
import { CardMetaSchema } from '@/features/deck/schemas'
import { DailyReviewStateSchema } from '@/features/review/schemas'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { reviewDaysCollection } from '@/features/review/collections'
import { useIntro } from '@/hooks/use-intro-seen'
import { ReviewIntro, ReviewCallout } from '@/components/intros'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	loader: async ({ context }) => {
		if (context.auth.isAuth) {
			await decksCollection.preload()
		}
	},
	component: ReviewPageSetup,
})

// Outer component handles auth check
function ReviewPageSetup() {
	const isAuth = useIsAuthenticated()

	// Require auth for review
	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to review your flashcards.">
				<div />
			</RequireAuth>
		)
	}

	return <ReviewPageContent />
}

// Inner component contains all the hooks - only rendered when authenticated
function ReviewPageContent() {
	const { lang } = Route.useParams()
	const navigate = useNavigate()
	const dayString = useReviewDayString()
	const stage = useReviewStage()
	const userId = useUserId()
	// const retrievabilityTarget = 0.9
	const { data: meta } = useDeckMeta(lang)
	const recs = useCompositePids(lang)
	const { data: deckPids } = useDeckPids(lang)
	const initLocalReviewState = useInitialiseReviewStore()
	const { data: stats } = useReviewsTodayStats(lang, dayString)

	const { isOpen, showCallout, handleClose, handleReopen } = useIntro('review')

	const sessionJustCreatedRef = useRef(false)
	const [algoRecsSelected, setAlgoRecsSelected] = useState<pids>([])

	// 2.
	// haven't built this feature yet, is why it's blank array
	// const friendRecsFromDB: pids = [] // useCardsRecommendedByFriends(lang)
	const friendRecsFiltered = arrayDifference(
		[] /* friendRecsFromDB */,
		[deckPids?.reviewed_or_inactive ?? []]
	)

	const friendRecsSelected = friendRecsFiltered.slice(
		0,
		meta?.daily_review_goal ?? 0
	)

	const countNeeded2 = min0(
		(meta?.daily_review_goal ?? 0) - friendRecsSelected.length
	)

	// 3. algo recs set by user
	const algoRecsFiltered = {
		popular: arrayDifference(recs?.top8.popular ?? [], [
			deckPids?.reviewed_or_inactive ?? [],
			friendRecsFiltered,
		]),
		easiest: arrayDifference(recs?.top8.easiest ?? [], [
			deckPids?.reviewed_or_inactive ?? [],
			friendRecsFiltered,
		]),
		newest: arrayDifference(recs?.top8.newest ?? [], [
			deckPids?.reviewed_or_inactive ?? [],
			friendRecsFiltered,
		]),
	}

	const countNeeded3 = min0(countNeeded2 - algoRecsSelected.length)
	const algosInitialCount =
		algoRecsFiltered.popular.length +
		algoRecsFiltered.easiest.length +
		algoRecsFiltered.newest.length
	const algosEmpty = algosInitialCount === 0

	// 4. deck cards
	// pull new unreviewed cards, excluding the friend recs we already got,
	// and limiting to the number we need from the deck
	const cardsUnreviewedActiveSelected = arrayDifference(
		deckPids?.unreviewed_active ?? [],
		[friendRecsSelected, algoRecsSelected]
	).slice(0, countNeeded3)

	// the user does not get to preview or select these.
	// in many cases, we'll be done here because people will have 15+ cards
	// available in their deck. but if not...

	const countNeeded4 = min0(countNeeded3 - cardsUnreviewedActiveSelected.length)

	// 5. pick cards randomly from the library, if needed

	// sorting by pid is randomish, but stable
	const libraryPhrasesSelected = arrayDifference(
		recs?.language_selectables ?? [],
		[friendRecsSelected, algoRecsSelected, cardsUnreviewedActiveSelected]
	)
		.toSorted((a, b) => (a > b ? -1 : 1))
		.slice(0, countNeeded4)

	// 6. now let's just collate the cards we need to create on user_card table
	const freshCards = arrayUnion([
		friendRecsSelected, // 2
		algoRecsSelected, // 3
		cardsUnreviewedActiveSelected, // 4
		libraryPhrasesSelected, // 5
	])

	const cardsToCreate = arrayDifference(freshCards, [deckPids?.all ?? []])

	const allPhraseIdsForToday = arrayUnion([
		freshCards,
		deckPids?.today_active ?? [],
	])

	// Get full card data for card-level manifest building
	const { data: deckCards } = useDeckCards(lang)

	// Sets for O(1) lookups in filters below
	const freshSet = new Set(freshCards)
	const allPhraseSet = new Set(allPhraseIdsForToday)

	// Mirror manifest construction so display counts match the session exactly.
	// A card enters the manifest if its phrase is in today's set AND it is
	// active AND (due OR unreviewed). Unreviewed siblings on scheduled phrases
	// count toward "Scheduled" — they ride along with a due sibling.
	let scheduledForward = 0
	let scheduledReverse = 0
	let newForward = 0
	let newReverse = 0

	// Per-phrase direction tracking for the phrase-level breakdown
	const newForwardPhrases = new Set<string>()
	const newReversePhrases = new Set<string>()
	const schedForwardPhrases = new Set<string>()
	const schedReversePhrases = new Set<string>()

	for (const card of deckCards ?? []) {
		if (!allPhraseSet.has(card.phrase_id)) continue
		if (card.status !== 'active') continue
		const isUnreviewed = !card.last_reviewed_at
		if (!isUnreviewed && !isDueCard(card)) continue
		const isFresh = isUnreviewed && freshSet.has(card.phrase_id)
		if (card.direction === 'forward') {
			if (isFresh) {
				newForward++
				newForwardPhrases.add(card.phrase_id)
			} else {
				scheduledForward++
				schedForwardPhrases.add(card.phrase_id)
			}
		} else {
			if (isFresh) {
				newReverse++
				newReversePhrases.add(card.phrase_id)
			} else {
				scheduledReverse++
				schedReversePhrases.add(card.phrase_id)
			}
		}
	}

	// Newly-created cards (not yet in deckCards) — always counted as new
	for (const pid of cardsToCreate) {
		const phrase = phrasesCollection.get(pid)
		for (const d of directionsForPhrase(phrase?.only_reverse)) {
			if (d === 'forward') {
				newForward++
				newForwardPhrases.add(pid)
			} else {
				newReverse++
				newReversePhrases.add(pid)
			}
		}
	}

	const dueCardCount = scheduledForward + scheduledReverse
	const newCardCount = newForward + newReverse
	const totalCardsForToday = dueCardCount + newCardCount
	const forwardCount = scheduledForward + newForward
	const reverseCount = scheduledReverse + newReverse

	// Phrase-level breakdown by direction coverage
	const newBothSides = [...newForwardPhrases].filter((pid) =>
		newReversePhrases.has(pid)
	).length
	const newFrontOnly = newForwardPhrases.size - newBothSides
	const newBackOnly = newReversePhrases.size - newBothSides

	const schedBothSides = [...schedForwardPhrases].filter((pid) =>
		schedReversePhrases.has(pid)
	).length
	const schedFrontOnly = schedForwardPhrases.size - schedBothSides
	const schedBackOnly = schedReversePhrases.size - schedBothSides

	function phraseBreakdown(
		bothSides: number,
		frontOnly: number,
		backOnly: number
	): string {
		const parts: Array<string> = []
		if (bothSides > 0) parts.push(`${bothSides} front+back`)
		if (frontOnly > 0) parts.push(`${frontOnly} recognition`)
		if (backOnly > 0) parts.push(`${backOnly} recall`)
		return parts.join(' · ')
	}

	// const countSurplusOrDeficit = freshCards.length - countNeeded
	const { mutate, isPending } = useMutation({
		mutationKey: ['user', lang, 'review', dayString, 'create'],
		mutationFn: async () => {
			// Create cards for new phrases, respecting only_reverse
			const cardInserts = cardsToCreate.flatMap((pid) => {
				const phrase = phrasesCollection.get(pid)
				return directionsForPhrase(phrase?.only_reverse).map((direction) => ({
					phrase_id: pid,
					lang,
					uid: userId!,
					status: 'active' as const,
					direction,
				}))
			})

			console.log(
				`Starting mutation to review ${totalCardsForToday} cards today, creating ${cardInserts.length} new card records`,
				{ cardsToCreate }
			)

			const { data: newCards } =
				cardInserts.length === 0
					? { data: [] }
					: await supabase
							.from('user_card')
							.upsert(cardInserts, {
								onConflict: 'uid,phrase_id,direction',
								ignoreDuplicates: true,
							})
							.select()
							.throwOnError()

			// Build manifest from card-level data.
			// 4 buckets: forward due → forward new → reverse due → reverse new
			const forwardDue: Array<ManifestEntry> = []
			const forwardNew: Array<ManifestEntry> = []
			const reverseDue: Array<ManifestEntry> = []
			const reverseNew: Array<ManifestEntry> = []

			const allPhraseSet = new Set(allPhraseIdsForToday)

			// Existing cards: due (retrievability ≤ 0.9) or unreviewed fresh
			for (const card of deckCards ?? []) {
				if (!allPhraseSet.has(card.phrase_id)) continue
				if (card.status !== 'active') continue

				const isUnreviewed = !card.last_reviewed_at
				if (!isUnreviewed && !isDueCard(card)) continue

				const entry = toManifestEntry(card.phrase_id, card.direction)
				const isFresh = isUnreviewed && freshSet.has(card.phrase_id)

				if (card.direction === 'forward') {
					;(isFresh ? forwardNew : forwardDue).push(entry)
				} else {
					;(isFresh ? reverseNew : reverseDue).push(entry)
				}
			}

			// Add newly created cards (not yet in deckCards)
			for (const insert of cardInserts) {
				const entry = toManifestEntry(insert.phrase_id, insert.direction)
				if (insert.direction === 'forward') {
					forwardNew.push(entry)
				} else {
					reverseNew.push(entry)
				}
			}

			const manifestEntries = [
				...forwardDue,
				...forwardNew,
				...reverseDue,
				...reverseNew,
			]

			const freshCardEntries = [...forwardNew, ...reverseNew]

			const { data: reviewDay } = await supabase
				.from('user_deck_review_state')
				.insert({
					lang,
					day_session: dayString,
					uid: userId!,
					manifest: manifestEntries,
				})
				.throwOnError()
				.select()
				.single()

			if (
				!Array.isArray(reviewDay?.manifest) ||
				reviewDay.manifest.length !== manifestEntries.length
			)
				console.warn(
					`Error creating daily session: expected manifest of length ${manifestEntries.length} but got back a manifest ${Array.isArray(reviewDay?.manifest) ? 'with ' + reviewDay.manifest.length + 'entries' : 'of type "' + typeof reviewDay?.manifest}".`
				)

			return {
				countCards: manifestEntries.length,
				countCardsFresh: freshCards.length,
				countCardsCreated: newCards.length,
				countCardsAlreadyExisted: cardInserts.length - newCards.length,
				freshCardEntries,
				newCards,
				reviewDay,
			}
		},
		onSettled: (data, error) => {
			if (error) throw error
			if (!data) throw new Error('No data returned from mutation')
			if (!data.reviewDay)
				throw new Error('No daily session data returned from mutation')
			if (!Array.isArray(data.reviewDay.manifest))
				throw new Error(
					`Error creating today's review session: server returned type "${typeof data.reviewDay.manifest}"`
				)
			if (data.reviewDay.manifest.length === 0)
				throw new Error(`Error creating today's review session: empty manifest`)

			// add new records to local db collections
			data.newCards.forEach((c) => {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(c))
			})
			reviewDaysCollection.utils.writeInsert(
				DailyReviewStateSchema.parse(data.reviewDay)
			)
			initLocalReviewState(
				lang,
				dayString,
				data.countCards,
				data.freshCardEntries
			)
			const toastMessage =
				data.countCardsAlreadyExisted > 0
					? `Ready! Could only create ${data.countCardsCreated} new cards — ${data.countCardsAlreadyExisted} already existed. You have ${data.countCards} total today.`
					: `Ready to go! ${data.countCardsCreated} new cards, ${data.countCards} total for today.`
			toastSuccess(toastMessage)
			sessionJustCreatedRef.current = true
			void navigate({ to: '/learn/$lang/review/preview', params: { lang } })
		},
	})

	// Data validation - these checks happen after all hooks
	if (meta?.lang !== lang)
		throw new Error("Attempted to build a review but we can't find the deck")
	if (!deckPids || !recs)
		throw new Error('Pids/recs should not be null here :/, even once')

	// when the manifest is present, skip this page, go to a better one
	// useRef guard: set synchronously in onSettled before React batch re-render, prevents redirect racing with navigate to /preview
	if (stats?.count && !sessionJustCreatedRef.current)
		return stats.complete === stats.count || stats.stage >= 5 ? (
			<WhenComplete />
		) : stage !== null ? (
			<Navigate to="/learn/$lang/review/go" from={Route.fullPath} />
		) : (
			<ContinueReview lang={lang} dayString={dayString} reviewStats={stats} />
		)

	return (
		<>
			{/* Review intro dialog for first-time reviewers */}
			<ReviewIntro open={isOpen} onClose={handleClose} />

			{/* Small callout for returning users */}
			{showCallout && (
				<div className="mb-4">
					<ReviewCallout onShowMore={handleReopen} />
				</div>
			)}

			<Card data-testid="review-setup-page">
				<CardHeader>
					<CardTitle className="flex flex-row justify-between">
						<div>Get Ready to review your {languages[lang]} cards</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground max-w-2xl text-lg">
						Your personalized review session is prepared and waiting for you.
						Here's what to expect...
					</p>
					{recs.language.length === 0 ? (
						<LanguageIsEmpty lang={lang} />
					) : recs.language_filtered.length === 0 ? (
						<LanguageFilteredIsEmpty lang={lang} />
					) : (
						<>
							<div className="flex flex-row flex-wrap gap-4 text-sm">
								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-2 text-xl">
											Today's Review
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-orange-500">
											<BookOpen />
											{totalCardsForToday}
										</p>
										<p className="text-muted-foreground">
											{forwardCount > 0 && reverseCount > 0 ? (
												<>
													{forwardCount} recognition + {reverseCount} recall,
													counting front and back of each phrase
												</>
											) : forwardCount > 0 ? (
												<>{forwardCount} recognition cards</>
											) : (
												<>{reverseCount} recall cards</>
											)}
										</p>
									</CardContent>
								</Card>
								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="text-xl">Scheduled</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-purple-500">
											<CalendarClock />
											<span>{dueCardCount}</span>
										</p>
										<p className="text-muted-foreground">
											{dueCardCount === 0
												? 'scheduled based on past reviews'
												: phraseBreakdown(
														schedBothSides,
														schedFrontOnly,
														schedBackOnly
													)}
										</p>
									</CardContent>
								</Card>
								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="text-xl">New Cards</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-green-500">
											<MessageSquarePlus />
											<span>{newCardCount}</span>
										</p>
										<p className="text-muted-foreground">
											{newCardCount === 0
												? 'new cards to learn'
												: phraseBreakdown(
														newBothSides,
														newFrontOnly,
														newBackOnly
													)}
										</p>
									</CardContent>
								</Card>

								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-2 text-xl">
											<MessageSquare className="text-primary" />
											Sources
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2">
										<Flagged
											name="friend_recommendations"
											className="flex items-center justify-between"
										>
											<span className="text-muted-foreground">
												Friend recs:
											</span>
											<Badge variant="outline">
												{friendRecsSelected.length}
											</Badge>
										</Flagged>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Sunlo's recs:
											</span>
											<Badge variant="outline">{algoRecsSelected.length}</Badge>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												From your deck:
											</span>
											<Badge variant="outline">
												{cardsUnreviewedActiveSelected.length}
											</Badge>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Public library:
											</span>
											<Badge variant="outline">
												{libraryPhrasesSelected.length}
											</Badge>
										</div>
									</CardContent>
								</Card>
							</div>
							{!(meta.daily_review_goal > totalCardsForToday) ? null : (
								<NotEnoughCards
									lang={lang}
									countNeeded={meta.daily_review_goal}
									totalCards={totalCardsForToday}
								/>
							)}
							<div className="flex basis-80 flex-row flex-wrap justify-items-stretch gap-4">
								<Drawer>
									<DrawerTrigger asChild>
										<Button
											className="grow font-normal"
											variant="neutral"
											size="lg"
											disabled={algosEmpty}
										>
											<Sparkles /> Recommendations ({algosInitialCount})
										</Button>
									</DrawerTrigger>
									<SelectPhrasesToAddToReview
										lang={lang}
										algoRecsSelected={algoRecsSelected}
										setAlgoRecsSelected={setAlgoRecsSelected}
										algoRecsFiltered={algoRecsFiltered}
										// countOfCardsDesired={countNeeded2}
									/>
								</Drawer>
								<Button
									data-testid="start-review-button"
									onClick={(e) => {
										e.preventDefault()
										e.stopPropagation()
										mutate()
									}}
									size="lg"
									disabled={isPending || totalCardsForToday === 0}
									className="grow"
								>
									<Rocket className="h-5 w-5" />
									Start Today's Review
								</Button>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</>
	)
}
