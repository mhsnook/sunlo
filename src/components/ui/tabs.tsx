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
			'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
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
			'inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs',
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
			'mt-2 ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
			className
		)}
		{...props}
	/>
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
