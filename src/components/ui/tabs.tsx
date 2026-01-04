import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = ({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.List>) => (
	<TabsPrimitive.List
		data-slot="tabs-list"
		className={cn(
			'bg-muted text-muted-foreground border-border/50 inline-flex h-10 items-center justify-center gap-1 rounded-2xl border p-1 inset-shadow-sm',
			className
		)}
		{...props}
	/>
)
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = ({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
	<TabsPrimitive.Trigger
		data-slot="tabs-trigger"
		className={cn(
			'data-[state=active]:border-primary ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex cursor-pointer items-center justify-center rounded-2xl border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=active]:cursor-default data-[state=active]:shadow-md',
			className
		)}
		{...props}
	/>
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = ({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) => (
	<TabsPrimitive.Content
		data-slot="tabs-content"
		className={cn(
			'ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
			className
		)}
		{...props}
	/>
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
