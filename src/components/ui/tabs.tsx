import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@/lib/utils'

const Tabs = ({ ...props }: TabsPrimitive.Root.Props) => (
	<TabsPrimitive.Root data-slot="tabs" {...props} />
)

const TabsList = ({ className, ...props }: TabsPrimitive.List.Props) => (
	<TabsPrimitive.List
		data-slot="tabs-list"
		className={cn(
			'bg-muted text-muted-foreground border-border/50 inline-flex h-10 items-center justify-center gap-1 rounded-2xl border p-1 inset-shadow-sm',
			className
		)}
		{...props}
	/>
)

const TabsTrigger = ({ className, ...props }: TabsPrimitive.Tab.Props) => (
	<TabsPrimitive.Tab
		data-slot="tabs-trigger"
		className={cn(
			'data-[selected]:border-primary ring-offset-background focus-visible:ring-ring data-[selected]:bg-background data-[selected]:text-foreground inline-flex cursor-pointer items-center justify-center rounded-2xl border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[selected]:cursor-default data-[selected]:shadow-md',
			className
		)}
		{...props}
	/>
)

const TabsContent = ({ className, ...props }: TabsPrimitive.Panel.Props) => (
	<TabsPrimitive.Panel
		data-slot="tabs-content"
		className={cn(
			'ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
			className
		)}
		{...props}
	/>
)

export { Tabs, TabsList, TabsTrigger, TabsContent }
