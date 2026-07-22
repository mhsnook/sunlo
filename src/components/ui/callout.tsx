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
	default: 'hue-primary chroma-mlo bg-lc-1 border-lc-3',
	problem:
		'hue-danger bg-lc-[97] bg-chroma-[3] border-lc-[88] border-chroma-[6]',
	ghost: 'border text-muted-foreground bg-muted',
}

const iconCircleVariants = {
	default: 'bg-lc-[95]',
	problem: 'border border-lc-[82] border-chroma-[9] bg-lc-none bg-chroma-lo',
	ghost: 'bg-lc-1 bg-chroma-lo bg-hue-neutral',
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
