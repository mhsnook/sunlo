import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Slot } from '@/lib/slot'

const buttonVariants = cva(
	'shadow inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-5-mhi-primary text-primary-foreground hover:opacity-90 aria-expanded:bg-5-mid-primary border border-background hover:border-primary-foresoft',
				soft: 'border border-3-mid-primary bg-1-mlo-primary hover:bg-lc-up-1 text-primary-foresoft hover:text-primary-foresoft',
				neutral:
					'bg-secondary text-secondary-foreground/80 hover:bg-secondary-foreground/10 border border-secondary-foreground/5',
				red: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				'red-soft':
					'border border-destructive text-destructive bg-destructive-foreground/80 hover:bg-destructive hover:text-destructive-foreground',
				ghost:
					'text-muted-foreground hover:bg-1-mlo-primary hover:text-foreground',
				'badge-outline':
					'rounded inline-flex border-border items-center border transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground/80 bg-foreground/5 hover:border-primary',
				'dashed-w-full':
					'w-full border-2 border-dashed border-border/50 hover:border-border hover:text-foreground shadow-none hover:shadow-sm',
			},
			size: {
				default: 'h-10 rounded-2xl px-5 py-2 gap-2',
				sm: 'h-8 rounded-xl px-4 gap-1 [&_svg]:size-3',
				lg: 'rounded-2xl px-8 py-3 text-lg font-medium gap-3 [&_svg]:size-6',
				icon: 'size-8 rounded-xl rounded-squircle shrink-0 aspect-square',
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
