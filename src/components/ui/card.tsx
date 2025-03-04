import * as React from 'react'

import { cn } from '@/lib/utils'

const Card = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="card"
		className={cn(
			'rounded-lg border bg-card text-card-foreground shadow-xs',
			className
		)}
		{...props}
	/>
)
Card.displayName = 'Card'

const CardHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="card-header"
		className={cn('flex flex-col space-y-1.5 p-6', className)}
		{...props}
	/>
)
CardHeader.displayName = 'CardHeader'

const CardTitle = ({
	className,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
	<h3
		data-slot="card-title"
		className={cn(
			'text-2xl font-semibold leading-none tracking-tight',
			className
		)}
		{...props}
	/>
)
CardTitle.displayName = 'CardTitle'

const CardDescription = ({
	className,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
	<p
		data-slot="card-description"
		className={cn('text-sm text-muted-foreground', className)}
		{...props}
	/>
)
CardDescription.displayName = 'CardDescription'

const CardContent = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="card-content"
		className={cn('p-6 pt-0', className)}
		{...props}
	/>
)
CardContent.displayName = 'CardContent'

const CardFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="card-footer"
		className={cn('flex items-center p-6 pt-0', className)}
		{...props}
	/>
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
