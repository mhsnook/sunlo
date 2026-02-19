import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Slot } from '@/lib/slot'

const buttonVariants = cva(
	'shadow inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				solid:
					'bg-7-hi-primary text-0-lo-primary border border-1-lo-primary hover:bg-lc-8 aria-expanded:opacity-70',
				soft: 'bg-1-mlo-primary text-7-hi-primary border border-2-mlo-primary hover:bg-lc-2',
				neutral:
					'text-6-lo-primary shadow-none hover:bg-1-lo-primary hover:text-lc-8',
				badge:
					'rounded shadow-none bg-1-lo-primary text-7-lo-primary border border-3-lo-primary hover:border-c-mid focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
				dashed:
					'border-2 border-dashed border-2-lo-primary hover:border-lc-4 hover:text-lc-9 shadow-none hover:shadow-sm',
			},
			intent: {
				primary: '',
				neutral: 'bg-h-neutral text-h-neutral border-h-neutral',
				destructive: 'bg-h-danger text-h-danger border-h-danger',
			},
			size: {
				default: 'h-10 rounded-2xl px-5 py-2 gap-2',
				sm: 'h-8 rounded-xl px-4 gap-1 [&_svg]:size-3',
				lg: 'rounded-2xl px-8 py-3 text-lg font-medium gap-3 [&_svg]:size-6',
				icon: 'size-8 rounded-xl rounded-squircle shrink-0 aspect-square',
			},
		},
		defaultVariants: {
			variant: 'solid',
			intent: 'primary',
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
	intent,
	size,
	asChild = false,
	...props
}: ButtonProps) => {
	const Comp = asChild ? Slot : 'button'
	return (
		<Comp
			className={cn(buttonVariants({ variant, intent, size }), className)}
			data-slot="button"
			{...props}
		/>
	)
}

export { Button }
