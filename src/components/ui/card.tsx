import * as React from 'react'

import { cn } from '@/lib/utils'

const Card = ({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="card"
		className={cn(
			'bg-card text-card-foreground rounded-lg border shadow-xs',
			className
		)}
		{...props}
	>
		{children}
	</div>
)
Card.displayName = 'Card'

const CardHeader = ({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="card-header"
		className={cn('flex flex-col space-y-1.5 p-6', className)}
		{...props}
	>
		{children}
	</div>
)
CardHeader.displayName = 'CardHeader'

const CardTitle = ({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
	<h3
		data-slot="card-title"
		className={cn(
			'text-2xl leading-none font-semibold tracking-tight',
			className
		)}
		{...props}
	>
		{children}
	</h3>
)
CardTitle.displayName = 'CardTitle'

const CardDescription = ({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
	<p
		data-slot="card-description"
		className={cn('text-muted-foreground text-sm', className)}
		{...props}
	>
		{children}
	</p>
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
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="card-footer"
		className={cn('flex items-center p-6 pt-0', className)}
		{...props}
	>
		{children}
	</div>
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
