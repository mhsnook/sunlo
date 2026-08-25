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
				'bg-primary-100 border-primary-400 mb-4 rounded border-l-4 p-4 italic',
				className
			)}
		>
			{children}
		</blockquote>
	)
}
