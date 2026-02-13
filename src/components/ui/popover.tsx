import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { cn } from '@/lib/utils'

const Popover = ({ ...props }: PopoverPrimitive.Root.Props) => (
	<PopoverPrimitive.Root data-slot="popover" {...props} />
)

const PopoverTrigger = ({
	asChild,
	children,
	...props
}: PopoverPrimitive.Trigger.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<PopoverPrimitive.Trigger
				data-slot="popover-trigger"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<PopoverPrimitive.Trigger data-slot="popover-trigger" {...props}>
			{children}
		</PopoverPrimitive.Trigger>
	)
}

const PopoverContent = ({
	className,
	align = 'center',
	sideOffset = 4,
	side = 'bottom',
	...props
}: PopoverPrimitive.Popup.Props &
	Pick<PopoverPrimitive.Positioner.Props, 'align' | 'sideOffset' | 'side'>) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Positioner
			align={align}
			sideOffset={sideOffset}
			side={side}
			className="isolate z-50"
		>
			<PopoverPrimitive.Popup
				data-slot="popover-content"
				className={cn(
					'bg-popover text-popover-foreground data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md outline-hidden',
					className
				)}
				{...props}
			/>
		</PopoverPrimitive.Positioner>
	</PopoverPrimitive.Portal>
)

export { Popover, PopoverTrigger, PopoverContent }
