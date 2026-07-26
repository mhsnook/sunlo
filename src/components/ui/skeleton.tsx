import { cn } from '@/lib/utils'
import * as React from 'react'

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('bg-lum-2 animate-pulse rounded-md', className)}
			{...props}
		/>
	)
}

export { Skeleton }
