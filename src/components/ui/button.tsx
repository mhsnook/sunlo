import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Slot } from '@/lib/slot'

// Hover uses an absolute lum stop (one step), not bg-lum-up/down: on an element
// that also sets a base bg-lum-N, the nudge's --bg-l ↔ --bg-anchor-l reference
// forms a custom-property cycle and the background resolves to transparent.
const solids = 'bg-lum-7 bg-chroma-mhigh text-white hover:bg-lum-8'
const softs =
	'bg-lum-2 bg-chroma-mlow text-lum-7 text-chroma-mid hover:bg-lum-1 hover:text-lum-up-1'

const buttonVariants = cva(
	'border border-transparent shadow inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: `hue-primary ${solids}`,
				soft: `hue-primary ${softs}`,
				red: `hue-danger ${solids}`,
				'red-soft': `hue-danger ${softs}`,
				neutral: 'hover:bg-lum-up-1 hover:bg-chroma-mlow',
				ghost: 'text-lum-6 hover:bg-lum-1 hover:text-lum-7',
				'badge-outline':
					'hue-neutral rounded border-border text-lum-8 text-chroma-mid bg-lum-1 hover:border-primary',
				'dashed-w-full':
					'w-full border-2 border-dashed border-lum-3 hover:border-border shadow-none hover:shadow',
			},
			size: {
				default: 'h-10 rounded-2xl px-5 py-2 gap-2 text-md',
				sm: 'h-8 rounded-xl px-4 gap-1 [&_svg]:size-3 text-sm',
				lg: 'rounded-2xl px-8 py-3 font-medium gap-3 [&_svg]:size-6 text-lg',
				icon: 'size-8 rounded-xl rounded-squircle shrink-0 aspect-square text-sm',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
)

export interface ButtonProps
	extends
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

export { buttonVariants }

const Button = ({
	className,
	variant,
	size,
	asChild = false,
	...props
}: ButtonProps) => {
	const Comp = asChild ? Slot : 'button'
	return (
		<Comp
			className={cn(buttonVariants({ variant, size }), className)}
			data-slot="button"
			{...props}
		/>
	)
}

export { Button }
