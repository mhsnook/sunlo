import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Slot } from '@/lib/slot'

/**
 * The message surface — the coloured pill a message sits in. Modelled on
 * shadcn's Bubble (ui.shadcn.com/docs/components/base/bubble), restyled onto
 * our flipping palette: shade numbers only, no opacity tints, and `text-paper`
 * on every filled surface.
 *
 * Scoped to the surface itself. Avatars, headers, timestamps and grouping live
 * in `./message`.
 */
const bubbleVariants = cva(
	'w-fit max-w-[80%] px-4 py-2 text-sm break-words whitespace-pre-wrap',
	{
		variants: {
			variant: {
				// Spelled out per variant rather than shared, for the same reason
				// buttonVariants spells its own out: Tailwind only compiles class
				// names that appear literally in the source.
				primary: 'bg-primary-700 text-paper',
				soft: 'bg-primary-100 text-primary-900',
				accent: 'bg-accent-100 text-accent-900',
				muted: 'bg-muted text-foreground',
				outline: 'border-border bg-card text-foreground border',
				// Unframed. For a message whose content brings its own card —
				// a phrase preview, a playlist — where a second frame would read
				// as a box inside a box.
				ghost: 'w-full max-w-full bg-transparent p-0',
			},
			align: {
				start: 'me-auto rounded-2xl rounded-es-sm',
				end: 'ms-auto rounded-2xl rounded-ee-sm',
			},
		},
		compoundVariants: [
			// A ghost bubble has no surface, so it has no corner to flatten.
			{ variant: 'ghost', className: 'rounded-none' },
		],
		defaultVariants: {
			variant: 'muted',
			align: 'start',
		},
	}
)

type BubbleProps = React.ComponentProps<'div'> &
	VariantProps<typeof bubbleVariants> & {
		/** Render as the child element instead of a div — for link and button bubbles. */
		asChild?: boolean
	}

const Bubble = ({
	className,
	variant,
	align,
	asChild = false,
	...props
}: BubbleProps) => {
	const Comp = asChild ? Slot : 'div'
	return (
		<Comp
			data-slot="bubble"
			data-align={align ?? 'start'}
			className={cn(bubbleVariants({ variant, align }), className)}
			{...props}
		/>
	)
}

export { Bubble, bubbleVariants }
export type { BubbleProps }
