import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
	'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-primary/90 aria-expanded:bg-primary/60',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-accent/30',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				'destructive-outline':
					'border border-destructive text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground',
				ghost: 'hover:bg-primary/30 hover:text-accent-foreground',
				outline: 'border border-primary bg-card hover:bg-primary/20',
				link: 'text-primary-foresoft underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-10 rounded-md px-4 py-2 gap-2',
				sm: 'h-9 rounded-md px-3 gap-1 [&_svg]:size-3',
				lg: 'rounded-md px-8 py-4 text-xl font-medium rounded-lg gap-3 [&_svg]:size-6',
				icon: 'size-10 rounded-full shrink-0',
				'icon-sm': 'size-6 rounded-full shrink-0',
				badge: 'h-6 rounded-full font-sm px-2 gap-1 my-0',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
)

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

export { buttonVariants }
