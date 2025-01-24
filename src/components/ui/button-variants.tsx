import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
	'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-primary/90 aria-expanded:bg-primary',
				secondary:
					'bg-foreground/10 hover:bg-primary/30 dark:hover:bg-primary/40 text-foreground',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				'destructive-outline':
					'border border-destructive text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground',
				ghost:
					'hover:bg-foreground/10 dark:hover:bg-background/20 text-muted-foreground',
				outline:
					'border border-primary text-primary bg-background hover:bg-primary/30',
				link: 'text-primary dark:text-white underline-offset-4 hover:underline',
				white:
					'bg-white hover:bg-primary text-primary hover:text-primary-foreground ring-1 border border-primary',
			},
			size: {
				default: 'h-10 px-4 py-2 rounded-md gap-2',
				sm: 'h-9 rounded-md px-3 gap-1',
				lg: 'rounded-md px-8 py-4 text-xl font-medium rounded-lg gap-3',
				icon: 'h-10 w-10 rounded-full flex-shrink-0',
				'icon-sm': 'h-6 w-6 rounded-full flex-shrink-0',
				badge: 'h-6 rounded-full font-sm px-1 gap-1',
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
