import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
	'rounded inline-flex items-center rounded border gap-1.5 font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary:
					'border-secondary-foreground/10 bg-secondary/50 text-secondary-foreground/80',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground',
				success: 'border-transparent bg-green-600 text-green-100 hover:shadow',
				outline: 'text-foreground font-normal border-muted-foresoft/30',
				lang: 'text-accent-foreground bg-accent/50 border-accent-foreground/10 uppercase',
			},
			size: {
				md: 'px-2.5 py-0.5 text-xs',
				sm: 'px-1 py-0 text-[0.5rem]',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'md',
		},
	}
)

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

export { badgeVariants }
