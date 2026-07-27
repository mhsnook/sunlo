import * as React from 'react'

import { Slot } from '@/lib/slot'

// Styles live in button.css, next to this file. Everything here is just
// choosing which class names to emit.
const sizes = {
	default: 'btn-size-default',
	sm: 'btn-size-sm',
	lg: 'btn-size-lg',
	icon: 'btn-size-icon',
} as const

// How loud, never what colour.
const variants = {
	default: 'btn-variant-default',
	soft: 'btn-variant-soft',
	neutral: 'btn-variant-neutral',
	ghost: 'btn-variant-ghost',
	'dashed-w-full': 'btn-variant-dashed-w-full',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export interface ButtonVariantProps {
	variant?: ButtonVariant | null
	size?: ButtonSize | null
}

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
	asChild?: boolean
}

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
			className={`btn ${sizes[size ?? 'default']} ${variants[variant ?? 'default']} ${className ?? ''}`}
			data-slot="button"
			{...props}
		/>
	)
}

export { Button }
