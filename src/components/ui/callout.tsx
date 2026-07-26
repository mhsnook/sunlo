import { cn } from '@/lib/utils'
import type { ComponentType, HTMLAttributes, PropsWithChildren } from 'react'

type CalloutProps = PropsWithChildren & {
	variant?: 'default' | 'problem' | 'ghost'
	size?: 'default' | 'sm'
	className?: string
	alert?: boolean
	Icon?: ComponentType
}

const variants = {
	// Seed the component's character once (primary hue, low-key chroma); the
	// interior — including the icon circle below — inherits it and speaks lc.
	default: 'hue-primary chroma-mlow bg-lum-2 border-lum-4',
	problem:
		'hue-danger bg-lum-[97] bg-chroma-[3] border-lum-[88] border-chroma-[6]',
	ghost: 'border text-con-mid bg-lum-2',
}

const iconCircleVariants = {
	default: 'bg-lum-[95]',
	problem: 'border border-lum-[82] border-chroma-[9] bg-lum-none bg-chroma-low',
	ghost: 'bg-lum-2 bg-chroma-low bg-hue-neutral',
}

const sizes = {
	default: 'py-[5%]',
	sm: 'py-[5%] @lg:py-[3%]',
}

export default function Callout({
	variant = 'default',
	size = 'default',
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
				className
			)}
		>
			{!Icon ? null : (
				<div
					className={cn(
						'flex size-12 shrink-0 items-center justify-center rounded-2xl p-2 [&>svg]:size-6',
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
