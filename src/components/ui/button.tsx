import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Slot } from '@/lib/slot'

const solids = 'bg-lc-7 bg-chroma-mhi text-white hover:bg-lc-up-1'
const softs =
	'bg-lc-1 bg-chroma-mlo text-lc-7 text-chroma-mid hover:bg-lc-down-1 hover:text-lc-up-1'

const buttonVariants = cva(
	'border border-transparent shadow inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-default transition-opacity [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: `hue-primary ${solids}`,
				soft: `hue-primary ${softs}`,
				red: `hue-danger ${solids}`,
				'red-soft': `hue-danger ${softs}`,
				neutral: 'hover:bg-lc-up-1 hover:bg-chroma-mlo',
				ghost:
					'text-chroma-lo text-lc-6 hover:bg-lc-0 hover:bg-chroma-lo hover:bg-hue-primary hover:text-lc-7',
				'badge-outline':
					'rounded border-border text-lc-8 text-chroma-mid text-hue-neutral bg-lc-0 bg-chroma-lo bg-hue-neutral hover:border-primary',
				'dashed-w-full':
					'w-full border-2 border-dashed border-lc-2 border-chroma-lo border-hue-primary hover:border-border shadow-none hover:shadow',
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
