import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ChoiceTileProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	selected: boolean
}

/**
 * A button styled as a selectable tile. Used in button-group selections
 * where the user picks one of several options (display preferences, deck
 * settings, signup role, etc.).
 *
 * The component handles selection-state styling, hover, focus-visible
 * ring, and disabled state. Layout of the inner content (icon position,
 * label, description) is up to the caller — pass children with whatever
 * flex utilities you need.
 */
export function ChoiceTile({
	selected,
	className,
	children,
	...props
}: ChoiceTileProps) {
	return (
		<button
			type="button"
			data-selected={selected || undefined}
			aria-pressed={selected}
			className={cn(
				'cursor-pointer rounded-2xl border-2 transition-colors',
				'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
				'disabled:cursor-not-allowed disabled:opacity-60',
				selected
					? 'bg-1-mlo-primary border-2-mlo-primary'
					: 'border-input hover:bg-base-mlo-primary hover:border-4-mlo-primary',
				className
			)}
			{...props}
		>
			{children}
		</button>
	)
}
