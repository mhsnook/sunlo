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
	problem: 'bg-1-mlo-danger border-3-mlo-danger',
	ghost: 'border text-muted-foreground bg-muted',
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
				<div className="bg-1-lo-neutral flex size-12 shrink-0 items-center justify-center rounded-full p-2 [&>svg]:size-6">
					<Icon />
				</div>
			)}
			<div className="space-y-2">{children}</div>
		</div>
	)
}
