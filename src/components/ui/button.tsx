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

// Straight from tailwind-oklch — no button-specific CSS needed. Omitting `hue`
// inherits from context, which is what you usually want: a button inside a
// language-themed subtree takes that language's colour on its own.
const hues = {
	primary: 'hue-primary',
	accent: 'hue-accent',
	neutral: 'hue-neutral',
	success: 'hue-success',
	warning: 'hue-warning',
	danger: 'hue-danger',
	info: 'hue-info',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes
export type ButtonHue = keyof typeof hues

export interface ButtonVariantProps {
	variant?: ButtonVariant | null
	size?: ButtonSize | null
	hue?: ButtonHue | null
}

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
	asChild?: boolean
}

const Button = ({
	className,
	variant,
	size,
	hue,
	asChild = false,
	...props
}: ButtonProps) => {
	const Comp = asChild ? Slot : 'button'
	return (
		<Comp
			className={`btn ${sizes[size ?? 'default']} ${variants[variant ?? 'default']} ${hue ? hues[hue] : ''} ${className ?? ''}`}
			data-slot="button"
			{...props}
		/>
	)
}

export { Button }
