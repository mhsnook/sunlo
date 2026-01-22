import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntroCalloutProps {
	children: React.ReactNode
	className?: string
	/** Called when user clicks to see more info */
	onShowMore?: () => void
	/** Label for the "show more" link */
	showMoreLabel?: string
}

/**
 * A small, inline notice for returning users who have already seen the full intro.
 * Like a Wikipedia "stub" notice - brief context with option to learn more.
 */
export function IntroCallout({
	children,
	className,
	onShowMore,
	showMoreLabel = 'Learn more',
}: IntroCalloutProps) {
	return (
		<div
			className={cn(
				'border-primary/30 bg-primary/10 flex items-start gap-2 rounded border px-3 py-2 text-sm',
				className
			)}
		>
			<Info className="text-primary mt-0.5 size-4 shrink-0" />
			<div className="flex-1">
				<span className="text-foreground/80">{children}</span>
				{onShowMore && (
					<>
						{' '}
						<button
							onClick={onShowMore}
							className="text-primary underline hover:no-underline"
						>
							{showMoreLabel}
						</button>
					</>
				)}
			</div>
		</div>
	)
}
