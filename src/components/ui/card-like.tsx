import React from 'react'
import { cn } from '@/lib/utils'
import { Card } from './card'

export const CardlikeRequest = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<Card
		className={cn(
			'bg-background @container rounded-none border shadow-none inset-shadow-sm',
			className
		)}
		{...props}
	/>
)

export const CardlikeFlashcard = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<Card
		className={cn(
			'bg-card border-primary @container rounded-lg border border-s-4 border-e-0 border-t-0 border-b-0 shadow-[7px_7px_12px_-3px_rgba(0,0,0,0.36)]',
			className
		)}
		{...props}
	/>
)
