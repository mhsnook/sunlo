import { useState } from 'react'
import { IntroSheet } from '@/components/intro-sheet'
import { IntroCallout } from '@/components/intro-callout'
import { useIntroSeen, INTRO_KEYS } from '@/hooks/use-intro-seen'

/**
 * Hook to manage the review intro state.
 */
export function useReviewIntro() {
	const { status, markSeen } = useIntroSeen(INTRO_KEYS.review)
	const [isOpen, setIsOpen] = useState(status === 'unseen')

	const handleClose = () => {
		markSeen()
		setIsOpen(false)
	}

	const handleReopen = () => setIsOpen(true)

	return {
		isOpen,
		showCallout: status !== 'unseen',
		handleClose,
		handleReopen,
	}
}

interface ReviewIntroProps {
	open: boolean
	onClose: () => void
}

/**
 * Full intro sheet explaining how reviews work.
 */
export function ReviewIntro({ open, onClose }: ReviewIntroProps) {
	return (
		<IntroSheet
			open={open}
			onOpenChange={(o) => !o && onClose()}
			title="How Reviews Work"
			description="Understanding spaced repetition will help you learn faster."
			actionLabel="Start reviewing"
			onAction={onClose}
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<p className="font-medium">Your first few days:</p>
					<p className="text-muted-foreground text-sm">
						Today you'll see your first batch of new cards. Each day after,
						you'll get more new cards plus reviews of ones you've seen before.
						It might seem light at first, but it builds up quickly!
					</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium">How spaced repetition works:</p>
					<ul className="text-muted-foreground ml-4 list-disc space-y-1 text-sm">
						<li>
							Cards you know well appear less often (days or weeks between
							reviews)
						</li>
						<li>Cards you struggle with appear more often until they stick</li>
						<li>
							The algorithm adapts to your memory, optimizing your study time
						</li>
					</ul>
				</div>

				<div className="space-y-2">
					<p className="font-medium">Two-stage reviews:</p>
					<ol className="text-muted-foreground ml-4 list-decimal space-y-1 text-sm">
						<li>
							<strong>Stage 1:</strong> Browse through all cards for the day,
							marking how well you know each one
						</li>
						<li>
							<strong>Stage 2:</strong> Practice the cards you marked as needing
							work, until you get them right
						</li>
					</ol>
				</div>

				<div className="bg-primary/5 rounded-lg border p-3 text-sm">
					<p className="font-medium">Tip: Consistency beats intensity</p>
					<p className="text-muted-foreground mt-1">
						10 minutes every day is better than an hour once a week. Try to
						review at the same time each day to build a habit.
					</p>
				</div>
			</div>
		</IntroSheet>
	)
}

interface ReviewCalloutProps {
	onShowMore: () => void
}

/**
 * Small callout for returning users.
 */
export function ReviewCallout({ onShowMore }: ReviewCalloutProps) {
	return (
		<IntroCallout onShowMore={onShowMore}>
			Reviews use spaced repetition to help you remember long-term.
		</IntroCallout>
	)
}
