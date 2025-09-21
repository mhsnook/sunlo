import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
	'shadow inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-primary/90 aria-expanded:bg-primary/60',
				secondary:
					'bg-secondary text-secondary-foreground/80 hover:bg-accent/30 border-secondary-foreground/10',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				'destructive-outline':
					'border border-destructive text-destructive bg-destructive-foreground/80 hover:bg-destructive hover:text-destructive-foreground',
				ghost:
					'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
				outline:
					'border border-transparent hover:border-primary-foresoft/30 bg-card hover:bg-primary/10 text-primary-foresoft',
				'outline-primary':
					'border border-primary bg-card hover:bg-primary/20 text-primary-foresoft bg-primary/10',
				'outline-accent':
					'bg-accent text-accent-foreground hover:pointer hover:outline outline-accent-foreground/30',
				'badge-outline':
					'rounded inline-flex border-border items-center border transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground/80 bg-foreground/5 hover:border-primary',
			},
			size: {
				default: 'h-10 rounded-2xl px-5 py-2 gap-2',
				sm: 'h-8 rounded-xl px-4 gap-1 [&_svg]:size-3',
				lg: 'rounded-2xl px-8 py-3 text-lg font-medium gap-3 [&_svg]:size-6',
				icon: 'size-8 rounded-xl shrink-0 aspect-square',
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
