import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'

import { cn } from '@/lib/utils'

const ScrollArea = ({
	className,
	children,
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) => (
	<ScrollAreaPrimitive.Root
		data-slot="scroll-area"
		className={cn('relative overflow-hidden', className)}
		{...props}
	>
		<ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
			{children}
		</ScrollAreaPrimitive.Viewport>
		<ScrollBar />
		<ScrollAreaPrimitive.Corner />
	</ScrollAreaPrimitive.Root>
)
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = ({
	className,
	orientation = 'vertical',
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		data-slot="scroll-bar"
		orientation={orientation}
		className={cn(
			'flex touch-none transition-colors select-none',
			orientation === 'vertical' &&
				'h-full w-2.5 border-l border-l-transparent p-[1px]',
			orientation === 'horizontal' &&
				'h-2.5 flex-col border-t border-t-transparent p-[1px]',
			className
		)}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className="bg-border relative flex-1 rounded-full" />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
)
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
