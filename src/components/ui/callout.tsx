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
	default: 'bg-primary-100 border-primary-300',
	problem: 'bg-danger-50 border-danger-100',
	ghost: 'border text-muted-foreground bg-muted',
}

const iconCircleVariants = {
	default: 'bg-primary-50',
	problem: 'border border-danger-200 bg-card',
	ghost: 'bg-neutral-100',
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
