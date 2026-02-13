import * as React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@/lib/utils'

const TooltipProvider = ({
	delayDuration,
	delay = delayDuration ?? 0,
	...props
}: TooltipPrimitive.Provider.Props & { delayDuration?: number }) => (
	<TooltipPrimitive.Provider
		data-slot="tooltip-provider"
		delay={delay}
		{...props}
	/>
)

const Tooltip = ({ ...props }: TooltipPrimitive.Root.Props) => (
	<TooltipPrimitive.Root data-slot="tooltip" {...props} />
)

const TooltipTrigger = ({
	asChild,
	children,
	...props
}: TooltipPrimitive.Trigger.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<TooltipPrimitive.Trigger
				data-slot="tooltip-trigger"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props}>
			{children}
		</TooltipPrimitive.Trigger>
	)
}

const TooltipContent = ({
	className,
	sideOffset = 4,
	side = 'top',
	align = 'center',
	...props
}: TooltipPrimitive.Popup.Props &
	Pick<TooltipPrimitive.Positioner.Props, 'sideOffset' | 'side' | 'align'>) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Positioner
			sideOffset={sideOffset}
			side={side}
			align={align}
			className="isolate z-50"
		>
			<TooltipPrimitive.Popup
				data-slot="tooltip"
				className={cn(
					'bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md',
					className
				)}
				{...props}
			/>
		</TooltipPrimitive.Positioner>
	</TooltipPrimitive.Portal>
)

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
