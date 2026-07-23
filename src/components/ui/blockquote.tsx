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
				'hue-primary chroma-mlo bg-lc-1 border-lc-4 mb-4 rounded border-l-4 p-4 italic',
				className
			)}
		>
			{children}
		</blockquote>
	)
}
