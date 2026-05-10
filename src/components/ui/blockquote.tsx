import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export function Blockquote({
	className,
	children,
}: {
	className?: string
	children?: ReactNode
}) {
	return (
		<blockquote
			className={cn(
				'border-4-mlo-primary bg-1-mlo-primary mb-4 rounded border-l-4 p-4 italic',
				className
			)}
		>
			{children}
		</blockquote>
	)
}
