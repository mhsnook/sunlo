import { cn } from '@/lib/utils'
import type { ComponentType, HTMLAttributes, PropsWithChildren } from 'react'

type CalloutProps = PropsWithChildren & {
	variant?: keyof typeof variants
	size?: keyof typeof sizes
	hue?: keyof typeof hues
	className?: string
	alert?: boolean
	Icon?: ComponentType
}

// How loud, never what colour.
const variants = {
	default: 'chroma-mlow bg-lum-2 border-lum-4',
	ghost: 'text-lum-7 bg-lum-1 chroma-mlow',
}

const iconCircleVariants = {
	default: '',
	ghost: 'bg-chroma-low border-lum-3',
}

const hues = {
	primary: 'hue-primary',
	accent: 'hue-accent',
	neutral: 'hue-neutral',
	success: 'hue-success',
	warning: 'hue-warning',
	danger: 'hue-danger',
	info: 'hue-info',
}

const sizes = {
	default: 'py-[5%]',
	sm: 'py-[5%] @lg:py-[3%]',
}

export default function Callout({
	variant = 'default',
	size = 'default',
	hue,
	alert = false,
	Icon,
	className,
	children,
}: CalloutProps) {
	let props: HTMLAttributes<HTMLDivElement> = {}
	if (alert) props.role = 'alert'
	return (
		<div
			{...props}
			className={cn(
				'flex flex-col items-start gap-4 rounded border px-[5%] @lg:flex-row',
				variants[variant],
				sizes[size],
				hue ? hues[hue] : '',
				className
			)}
		>
			{!Icon ? null : (
				// The hue is on the wrapper, so the circle inherits it.
				<div
					className={cn(
						'bg-lum-1 flex size-12 shrink-0 items-center justify-center rounded-2xl border p-2 [&>svg]:size-6',
						iconCircleVariants[variant]
					)}
				>
					<Icon />
				</div>
			)}
			<div className="min-w-0 space-y-2">{children}</div>
		</div>
	)
}
