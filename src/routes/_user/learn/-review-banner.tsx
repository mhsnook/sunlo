import { Link } from '@tanstack/react-router'
import { Rocket } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import type { DeckMetaType } from '@/features/deck/schemas'
import { useLangActiveDays } from './-deck-ranking'

export function ReviewBanner({
	focus,
	focusDue,
}: {
	focus: DeckMetaType | undefined
	focusDue: number
}) {
	const activeDays = useLangActiveDays(focus?.lang)

	if (!focus || focusDue <= 0) return null

	const estMinutes = Math.max(1, Math.round((focusDue * 20) / 60))

	return (
		<div
			data-testid="review-ready-banner"
			data-key={focus.lang}
			className="bg-lc-1 bg-chroma-mlo bg-hue-info border-lc-2 border-chroma-lo border-hue-info border-s-6-mhi-primary @container relative overflow-hidden rounded-lg border border-s-4 p-4 shadow-sm @md:p-5"
		>
			<div className="flex flex-col items-start gap-4 @md:flex-row @md:items-center @md:justify-between">
				<div className="flex items-center gap-4">
					<img
						src="/images/garlic-logo.svg"
						alt="a smiling garlic"
						width={56}
						height={56}
						className="hidden shrink-0 place-self-center @sm:block"
					/>

					<div className="space-y-1">
						<h2 className="text-lg leading-tight font-bold @md:text-xl">
							<span className="text-primary-foresoft">{focusDue}</span>{' '}
							{focus.language} {focusDue === 1 ? 'card' : 'cards'} ready for
							review
						</h2>
						<p className="text-muted-foreground text-sm">
							About {estMinutes} {estMinutes === 1 ? 'minute' : 'minutes'}.
							Consistency beats cramming —{' '}
							{activeDays > 0 ? (
								<>
									you&apos;ve studied{' '}
									<span className="text-foreground font-medium">
										{activeDays} of the last 7 days
									</span>
									.
								</>
							) : (
								<>start your streak today.</>
							)}
						</p>
					</div>
				</div>

				<Link
					to="/learn/$lang/review"
					params={{ lang: focus.lang }}
					data-testid="start-review-button"
					className={buttonVariants({
						variant: 'default',
						className: 'shrink-0',
					})}
				>
					<Rocket />
					Start review
				</Link>
			</div>
		</div>
	)
}
