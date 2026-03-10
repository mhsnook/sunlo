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
	default: 'bg-1-mlo-primary border-3-mlo-primary',
	problem: 'hue-danger bg-lc-[97] bg-c-[3] border-lc-[88] border-c-[6]',
	ghost: 'border text-muted-foreground bg-muted',
}

const iconCircleVariants = {
	default: 'bg-lc-[97] bg-c-[2]',
	problem: 'border border-lc-[82] border-c-[9] bg-none-lo',
	ghost: 'bg-1-lo-neutral',
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
			<div className="space-y-2">{children}</div>
		</div>
	)
}
