import { pids } from '@/types/main'
import Flagged from '../flagged'
import { ProcessedDeckAndPids } from '@/lib/process-pids'
import ExtraInfo from '../extra-info'
import { AlgoRecsObject } from './select-phrases-to-add-to-review'

type ExplainingTheReviewProps = {
	today_active: pids
	countNeeded: number
	freshCards: pids
	countSurplusOrDeficit: number
	cardsToCreate: pids
	allCardsForToday: pids
	friendRecsFiltered: pids
	friendRecsSelected: pids
	countNeeded2: number
	algoRecsFiltered: AlgoRecsObject
	algoRecsSelected: pids
	countNeeded3: number
	pids: ProcessedDeckAndPids
	cardsUnreviewedActiveSelected: pids
	countNeeded4: number
	libraryPhrasesSelected: pids
}

export function ExplainTodaysReview({
	today_active,
	countNeeded,
	freshCards,
	countSurplusOrDeficit,
	cardsToCreate,
	allCardsForToday,
	friendRecsFiltered,
	friendRecsSelected,
	countNeeded2,
	algoRecsFiltered,
	algoRecsSelected,
	countNeeded3,
	pids,
	cardsUnreviewedActiveSelected,
	countNeeded4,
	libraryPhrasesSelected,
}: ExplainingTheReviewProps) {
	return (
		<ExtraInfo title="Explaining today's review cards">
			<p>
				<strong>{today_active.length} cards</strong> previously scheduled.
				<br />
				<strong>{countNeeded} new cards</strong> is your daily goal.
				<br />
				<strong>{freshCards.length} new cards</strong> selected for you/by you,
				which is <br />
				<strong>{Math.abs(countSurplusOrDeficit)} cards</strong>{' '}
				{countSurplusOrDeficit > 0 ? 'above' : 'less than'} your daily goal.
				<br />
				(of which {cardsToCreate.length} were not previously in your deck).
				<br />
				<strong>{allCardsForToday.length} total cards</strong> for review today.
			</p>
			<Flagged name="friend_recommendations">
				<p>
					There are {friendRecsFiltered.length} friend recommendations, of which
					you've selected {friendRecsSelected.length}. So you still need to get{' '}
					{countNeeded2} countNeeded2.
				</p>
			</Flagged>
			<p>
				We offered some recs from the algorithm &mdash;{' '}
				{algoRecsFiltered.popular.length} popular,{' '}
				{algoRecsFiltered.easiest.length} easy-ish,{' '}
				{algoRecsFiltered.newest.length} newest &mdash; and you selected{' '}
				{algoRecsSelected.length} selectedAlgoRecs, meaning you still need{' '}
				{countNeeded3}.
			</p>
			<p>
				Next we went looking in your deck for cards you've selected, but haven't
				reviewed before: there are {pids.unreviewed_active.length} of them (out
				of {pids.deck.length} total in your deck), and we managed to get{' '}
				{cardsUnreviewedActiveSelected.length} of them (unsure why there would
				ever be a discrepancy here), leaving {countNeeded4} to pull from the
				library.
			</p>
			<p>
				We have {pids.not_in_deck.length} cards in the library that aren't
				already in your deck or weren't chosen from the recommendations, the{' '}
				{pids.language.length} total phrases in the library and found{' '}
				{pids.not_in_deck.length} which are not in your deck, and we grabbed{' '}
				{libraryPhrasesSelected.length} of them.
			</p>
			<p>
				So the total number of cards is {allCardsForToday.length}, which is{' '}
				{today_active.length} scheduled + {friendRecsSelected.length} friend
				recs + {algoRecsSelected.length} algo recs +{' '}
				{cardsUnreviewedActiveSelected.length} deck +{' '}
				{libraryPhrasesSelected.length} library ={' '}
				{today_active.length +
					friendRecsSelected.length +
					algoRecsSelected.length +
					cardsUnreviewedActiveSelected.length +
					libraryPhrasesSelected.length}
			</p>
		</ExtraInfo>
	)
}
