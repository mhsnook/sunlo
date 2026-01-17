import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
	'rounded inline-flex items-center border transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-xs inset-shadow-xs',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-white',
				secondary:
					'border-secondary-foreground/10 bg-secondary/50 text-secondary-foreground/80',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground',
				success: 'border-transparent bg-green-600 text-green-100',
				outline:
					'text-primary-foresoft border-primary-foresoft/20 bg-foreground/5',
				lang: 'text-accent-foreground/70 font-mono font-normal bg-accent-invert border-accent-foreground/20 uppercase',
			},
			size: {
				lg: 'px-3 py-1 gap-2 [&>svg]:h-4 [&>svg]:w-4 [&>button]:h-5 [&>button]:w-5',
				md: 'px-2.5 py-0.5 text-xs gap-1.5 h-6 [&>svg]:h-4 [&>svg]:w-4',
				sm: 'px-1 py-0 text-[0.5rem] gap-1 [&>svg]:h-3 [&>svg]:w-3',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'md',
		},
	}
)

export interface BadgeProps
	extends
		React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

export { badgeVariants }
