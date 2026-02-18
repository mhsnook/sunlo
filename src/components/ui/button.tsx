import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Slot } from '@/lib/slot'

const buttonVariants = cva(
	'shadow inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				solid: '',
				soft: '',
				ghost:
					'text-muted-foreground hover:bg-primary/10 hover:text-foreground shadow-none',
				badge:
					'rounded inline-flex border-border items-center border transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground/80 bg-foreground/5 hover:border-primary shadow-none',
				dashed:
					'w-full border-2 border-dashed border-border/50 hover:border-border hover:text-foreground shadow-none hover:shadow-sm',
			},
			intent: {
				primary: '',
				neutral: '',
				destructive: '',
			},
			size: {
				default: 'h-10 rounded-2xl px-5 py-2 gap-2',
				sm: 'h-8 rounded-xl px-4 gap-1 [&_svg]:size-3',
				lg: 'rounded-2xl px-8 py-3 text-lg font-medium gap-3 [&_svg]:size-6',
				icon: 'size-8 rounded-xl rounded-squircle shrink-0 aspect-square',
			},
		},
		compoundVariants: [
			// Solid variants
			{
				variant: 'solid',
				intent: 'primary',
				className:
					'bg-primary-foresoft dark:bg-primary text-white hover:opacity-90 aria-expanded:bg-primary-foresoft/60 border border-background dark:text-white hover:border-primary-foresoft',
			},
			{
				variant: 'solid',
				intent: 'neutral',
				className:
					'bg-secondary text-secondary-foreground/80 hover:bg-secondary-foreground/10 border border-secondary-foreground/5',
			},
			{
				variant: 'solid',
				intent: 'destructive',
				className:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90',
			},
			// Soft variants
			{
				variant: 'soft',
				intent: 'primary',
				className:
					'border border-primary-foresoft/40 bg-primary/10 hover:bg-primary/30 text-primary-foresoft hover:text-primary-foresoft dark:bg-primary-invert/40 dark:hover:bg-primary-invert/50',
			},
			{
				variant: 'soft',
				intent: 'destructive',
				className:
					'border border-destructive text-destructive bg-destructive-foreground/80 hover:bg-destructive hover:text-destructive-foreground',
			},
		],
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
