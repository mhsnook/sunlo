import { Link } from '@tanstack/react-router'
import { Sparkles, X } from 'lucide-react'
import { useProfile } from '@/features/profile/hooks'
import { myProfileCollection } from '@/features/profile/collections'
import { FLAG_NEEDS_ONBOARDING } from '@/features/profile/schemas'
import { useSidebar } from '@/components/ui/sidebar'
import { buttonVariants } from '@/components/ui/button'

// Soft pull toward /getting-started for users who have a profile row but
// have not picked a username + languages yet. Replaces the old hard
// redirect: nothing blocks the app, and the user can dismiss it.
export function OnboardingNudge() {
	const { data: profile } = useProfile()
	const { setClosedMobile, open } = useSidebar()

	if (profile?.flags[FLAG_NEEDS_ONBOARDING] !== true) return null

	const dismiss = () => {
		const tx = myProfileCollection.update(profile.uid, (draft) => {
			draft.flags = { ...draft.flags, [FLAG_NEEDS_ONBOARDING]: false }
		})
		tx.isPersisted.promise.catch((error: unknown) => {
			console.log('Failed to dismiss onboarding nudge', error)
		})
	}

	// Collapsed sidebar: compact icon link, matching ActiveReviewCallout.
	if (!open) {
		return (
			<Link
				to="/getting-started"
				onClick={setClosedMobile}
				data-testid="onboarding-nudge"
				className="text-lc-5 text-chroma-mid text-hue-primary hover:bg-lc-up-1 mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white transition-colors"
				aria-label="Continue setting up your account"
			>
				<Sparkles className="h-4 w-4" />
			</Link>
		)
	}

	return (
		<div
			data-testid="onboarding-nudge"
			className="hue-primary border-lc-[87] border-chroma-[6] bg-lc-[93] bg-chroma-[4] mx-2 mb-2 rounded-xl border p-3"
		>
			<div className="flex items-start gap-2">
				<div className="rounded-lg bg-white p-1.5">
					<Sparkles className="text-lc-5 text-chroma-mid h-4 w-4" />
				</div>
				<div className="flex-1">
					<p className="text-sm font-semibold">Continue setup</p>
					<p className="text-muted-foreground text-sm">
						Set your profile name, language preferences, and get started
						learning!
					</p>
				</div>
				<button
					type="button"
					onClick={dismiss}
					data-testid="onboarding-nudge-dismiss"
					aria-label="Dismiss"
					className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 rounded p-1"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</div>
			<Link
				to="/getting-started"
				onClick={setClosedMobile}
				data-testid="onboarding-nudge-cta"
				className={buttonVariants({
					variant: 'default',
					size: 'sm',
					className: 'mt-2 w-full',
				})}
			>
				Continue
			</Link>
		</div>
	)
}
