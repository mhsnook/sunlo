import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@/lib/utils'

const Tabs = ({ ...props }: TabsPrimitive.Root.Props) => (
	<TabsPrimitive.Root data-slot="tabs" {...props} />
)

const TabsList = ({ className, ...props }: TabsPrimitive.List.Props) => (
	<TabsPrimitive.List
		data-slot="tabs-list"
		className={cn(
			'bg-lum-2 text-lum-7 border-lum-3 inline-flex h-10 items-center justify-center gap-1 rounded-2xl border p-1 inset-shadow-sm',
			className
		)}
		{...props}
	/>
)

const TabsTrigger = ({ className, ...props }: TabsPrimitive.Tab.Props) => (
	<TabsPrimitive.Tab
		data-slot="tabs-trigger"
		className={cn(
			'data-[active]:border-lum-4 data-[active]:border-chroma-max focus-visible:outline-con-high data-[active]:bg-lum-1 data-[active]:text-con-mhigh inline-flex cursor-pointer items-center justify-center rounded-2xl border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[active]:cursor-default data-[active]:shadow-md',
			className
		)}
		{...props}
	/>
)

const TabsContent = ({ className, ...props }: TabsPrimitive.Panel.Props) => (
	<TabsPrimitive.Panel
		data-slot="tabs-content"
		className={cn(
			'focus-visible:outline-con-high mt-2 focus-visible:outline-2 focus-visible:outline-offset-2',
			className
		)}
		{...props}
	/>
)

export { Tabs, TabsList, TabsTrigger, TabsContent }
