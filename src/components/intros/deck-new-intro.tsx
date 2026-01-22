import { Link, useParams } from '@tanstack/react-router'
import { Construction, Contact, Logs, MessageSquarePlus } from 'lucide-react'
import { IntroSheet } from '@/components/intro-sheet'
import { IntroCallout } from '@/components/intro-callout'
import { useLanguageMeta } from '@/hooks/use-language'
import { buttonVariants } from '@/components/ui/button'
import languages from '@/lib/languages'

interface DeckNewIntroProps {
	open: boolean
	onClose: () => void
}

export function DeckNewIntro({ open, onClose }: DeckNewIntroProps) {
	const { lang } = useParams({ strict: false })
	const { data: languageMeta } = useLanguageMeta(lang ?? '')
	const isNewLanguage = !((languageMeta?.phrases_to_learn ?? 0) > 15)

	return (
		<IntroSheet
			open={open}
			onOpenChange={(o) => !o && onClose()}
			title="Welcome to Your New Deck!"
			description={`You're starting your ${languages[lang ?? ''] ?? 'new language'} learning journey.`}
			actionLabel="Let's get started"
			onAction={onClose}
		>
			<div className="space-y-4">
				{isNewLanguage && (
					<div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
						<div className="flex items-center gap-2">
							<Construction className="size-5 text-amber-600" />
							<span className="font-semibold">
								This is a brand new language!
							</span>
						</div>
						<p className="text-sm">
							The {languages[lang ?? '']} library is still being built. You can
							help by:
						</p>
						<ul className="ml-4 list-disc space-y-1 text-sm">
							<li>Inviting a native speaker friend to help you</li>
							<li>Adding phrases as you learn them from friends or teachers</li>
							<li>Making phrase requests for things you want to say</li>
						</ul>
					</div>
				)}

				<div className="space-y-2">
					<p className="font-medium">Here's how to get started:</p>
					<ul className="ml-4 list-disc space-y-2 text-sm">
						<li>
							<strong>Browse the feed</strong> to discover phrases others have
							added
						</li>
						<li>
							<strong>Add cards</strong> to your deck when you find useful
							phrases
						</li>
						<li>
							<strong>Review daily</strong> using spaced repetition to build
							lasting memory
						</li>
						<li>
							<strong>Invite friends</strong> who speak {languages[lang ?? '']}{' '}
							to help you learn
						</li>
					</ul>
				</div>

				<div className="flex flex-wrap gap-2 pt-2">
					<Link
						to="/learn/$lang/feed"
						params={{ lang: lang ?? '' }}
						className={buttonVariants({ variant: 'outline', size: 'sm' })}
					>
						<Logs className="size-4" /> Browse Feed
					</Link>
					<Link
						to="/learn/$lang/phrases/new"
						params={{ lang: lang ?? '' }}
						className={buttonVariants({ variant: 'outline', size: 'sm' })}
					>
						<MessageSquarePlus className="size-4" /> Add Phrase
					</Link>
					<Link
						to="/friends"
						className={buttonVariants({ variant: 'outline', size: 'sm' })}
					>
						<Contact className="size-4" /> Invite Friends
					</Link>
				</div>
			</div>
		</IntroSheet>
	)
}

interface DeckNewCalloutProps {
	onShowMore: () => void
}

export function DeckNewCallout({ onShowMore }: DeckNewCalloutProps) {
	const { lang } = useParams({ strict: false })
	const { data: languageMeta } = useLanguageMeta(lang ?? '')
	const isNewLanguage = !((languageMeta?.phrases_to_learn ?? 0) > 15)

	if (!isNewLanguage) return null

	return (
		<IntroCallout onShowMore={onShowMore} showMoreLabel="See tips">
			{languages[lang ?? '']} is still growing! Help build the library by adding
			phrases and inviting friends.
		</IntroCallout>
	)
}
