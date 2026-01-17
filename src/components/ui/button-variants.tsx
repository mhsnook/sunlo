import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
	'shadow inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-primary-foresoft dark:bg-primary text-white hover:opacity-90 aria-expanded:bg-primary-foresoft/60 border border-background dark:text-white hover:border-primary-foresoft',
				accent:
					'bg-accent-foresoft dark:bg-accent text-white hover:opacity-90 aria-expanded:bg-accent-foresoft/60 border border-background dark:text-white hover:border-accent-foresoft',
				secondary:
					'bg-secondary text-secondary-foreground/80 hover:bg-primary-invert/50 border border-secondary-foreground/5',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				'destructive-outline':
					'border border-destructive text-destructive bg-destructive-foreground/80 hover:bg-destructive hover:text-destructive-foreground',
				ghost:
					'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
				outline:
					'border border-primary-foresoft/10 hover:border-primary-foresoft/30 bg-card/50 hover:bg-background text-primary-foresoft',
				'outline-primary':
					'border border-primary-foresoft/40 bg-primary/10 hover:bg-primary/30 text-primary-foresoft hover:text-primary-foresoft dark:bg-primary-invert/40 dark:hover:bg-primary-invert/50',
				'outline-accent':
					'border border-accent-foresoft/40 bg-accent/10 hover:bg-accent/30 text-accent-foreground hover:text-accent-foresoft dark:bg-accent-invert/40 dark:hover:bg-accent-invert/50',
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
