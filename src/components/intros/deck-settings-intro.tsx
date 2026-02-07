import { IntroSheet } from '@/components/intro-sheet'
import { IntroCallout } from '@/components/intro-callout'

interface DeckSettingsIntroProps {
	open: boolean
	onClose: () => void
}

export function DeckSettingsIntro({ open, onClose }: DeckSettingsIntroProps) {
	return (
		<IntroSheet
			open={open}
			onOpenChange={(o) => !o && onClose()}
			title="Deck Settings"
			description="Customize your learning experience."
			actionLabel="Got it"
			onAction={onClose}
			data-testid="deck-settings-intro"
			actionTestId="deck-settings-intro-dismiss"
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<p className="font-medium">Daily Goal</p>
					<p className="text-muted-foreground text-sm">
						This controls how many <em>new</em> cards you see each day. A higher
						number means faster progress but more daily reviews. Most learners
						do well with 10-15 new cards per day.
					</p>
					<ul className="text-muted-foreground ml-4 list-disc text-sm">
						<li>
							<strong>10 (Relaxed)</strong> - ~45 total reviews/day
						</li>
						<li>
							<strong>15 (Standard)</strong> - ~80 total reviews/day
						</li>
						<li>
							<strong>20 (Serious)</strong> - ~125 total reviews/day
						</li>
					</ul>
				</div>

				<div className="space-y-2">
					<p className="font-medium">Learning Goal</p>
					<p className="text-muted-foreground text-sm">
						This helps us understand your motivation and may influence content
						recommendations in the future. Choose what best describes why you're
						learning this language.
					</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium">Translation Language</p>
					<p className="text-muted-foreground text-sm">
						By default, translations show in your profile's primary language. If
						you want this deck to show translations in a different language
						(e.g., Spanish instead of English), you can override it here.
					</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium">Archive Deck</p>
					<p className="text-muted-foreground text-sm">
						If you want to pause learning this language, you can archive the
						deck. Your progress is saved and you can reactivate anytime.
					</p>
				</div>
			</div>
		</IntroSheet>
	)
}

interface DeckSettingsCalloutProps {
	onShowMore: () => void
}

export function DeckSettingsCallout({ onShowMore }: DeckSettingsCalloutProps) {
	return (
		<IntroCallout onShowMore={onShowMore}>
			Adjust your daily goal, learning motivation, and more.
		</IntroCallout>
	)
}
