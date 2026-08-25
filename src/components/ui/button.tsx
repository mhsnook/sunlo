import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Slot } from '@/lib/slot'

const buttonVariants = cva(
	'border border-transparent shadow inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				// Spelled out per variant rather than shared: Tailwind only sees
				// class names that appear literally in the source, so a `solid(hue)`
				// helper would compile to nothing.
				default: 'bg-primary-700 text-paper hover:bg-primary-800',
				soft: 'bg-primary-100 text-primary-700 hover:bg-primary-50 hover:text-primary-800',
				red: 'bg-danger-700 text-paper hover:bg-danger-800',
				'red-soft':
					'bg-danger-100 text-danger-700 hover:bg-danger-50 hover:text-danger-800',
				neutral: 'hover:bg-neutral-200',
				ghost: 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700',
				'badge-outline':
					'rounded border-border text-neutral-800 bg-neutral-50 hover:border-primary',
				'dashed-w-full':
					'w-full border-2 border-dashed border-neutral-200 hover:border-border shadow-none hover:shadow',
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
