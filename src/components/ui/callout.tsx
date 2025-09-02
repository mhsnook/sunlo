import { cn } from '@/lib/utils'
import type { ComponentType, HTMLAttributes, PropsWithChildren } from 'react'

type CalloutProps = PropsWithChildren & {
	variant?: 'default' | 'problem' | 'ghost'
	className?: string
	alert?: boolean
	Icon?: ComponentType
}

const variants = {
	default: 'bg-primary/20 border-primary/50',
	problem: 'bg-destructive/20 border-destructive/50',
	ghost: 'bg-primary/20 border text-muted-foreground bg-muted',
}

export default function Callout({
	variant = 'default',
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
				'flex flex-col items-center gap-4 rounded border px-[5%] py-[5%] @lg:flex-row @lg:py-[3%]',
				variants[variant],
				className
			)}
		>
			{!Icon ? null : (
				<div className="min-w-4vh aspect-square">
					<Icon />
				</div>
			)}
			<div className="space-y-2">{children}</div>
		</div>
	)
}
