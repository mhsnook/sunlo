import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root

const SelectGroup = ({ ...props }: SelectPrimitive.Group.Props) => (
	<SelectPrimitive.Group data-slot="select-group" {...props} />
)

const SelectValue = ({ ...props }: SelectPrimitive.Value.Props) => (
	<SelectPrimitive.Value data-slot="select-value" {...props} />
)

const SelectTrigger = ({
	className,
	children,
	asChild,
	...props
}: SelectPrimitive.Trigger.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<SelectPrimitive.Trigger
				data-slot="select-trigger"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				'ring-offset-background data-[placeholder]:text-muted-foreground focus:ring-ring flex h-10 w-full items-center justify-between rounded-2xl px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
				className
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon>
				<ChevronDown className="h-4 w-4 opacity-50" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	)
}

const SelectScrollUpButton = ({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) => (
	<SelectPrimitive.ScrollUpArrow
		className={cn(
			'flex cursor-default items-center justify-center py-1',
			className
		)}
		{...props}
	>
		<ChevronUp className="h-4 w-4" />
	</SelectPrimitive.ScrollUpArrow>
)

const SelectScrollDownButton = ({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) => (
	<SelectPrimitive.ScrollDownArrow
		className={cn(
			'flex cursor-default items-center justify-center py-1',
			className
		)}
		{...props}
	>
		<ChevronDown className="h-4 w-4" />
	</SelectPrimitive.ScrollDownArrow>
)

const SelectContent = ({
	className,
	children,
	side = 'bottom',
	sideOffset = 4,
	align = 'center',
	...props
}: SelectPrimitive.Popup.Props &
	Pick<SelectPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset'>) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Positioner
			side={side}
			sideOffset={sideOffset}
			align={align}
			className="isolate z-50"
		>
			<SelectPrimitive.Popup
				data-slot="select-content"
				className={cn(
					'bg-popover text-popover-foreground data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl border shadow-md',
					className
				)}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.List className="p-1">{children}</SelectPrimitive.List>
				<SelectScrollDownButton />
			</SelectPrimitive.Popup>
		</SelectPrimitive.Positioner>
	</SelectPrimitive.Portal>
)

const SelectLabel = ({
	className,
	...props
}: SelectPrimitive.GroupLabel.Props) => (
	<SelectPrimitive.GroupLabel
		data-slot="select-label"
		className={cn('py-1.5 pr-2 pl-8 text-sm font-semibold', className)}
		{...props}
	/>
)

const SelectItem = ({
	className,
	children,
	...props
}: SelectPrimitive.Item.Props) => (
	<SelectPrimitive.Item
		data-slot="select-item"
		className={cn(
			'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center rounded-2xl py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<SelectPrimitive.ItemIndicator>
				<Check className="h-4 w-4" />
			</SelectPrimitive.ItemIndicator>
		</span>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
)

const SelectSeparator = ({
	className,
	...props
}: SelectPrimitive.Separator.Props) => (
	<SelectPrimitive.Separator
		data-slot="select-separator"
		className={cn('bg-muted -mx-1 my-1 h-px', className)}
		{...props}
	/>
)

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
}
