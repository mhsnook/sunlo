import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Check, ChevronRight, Circle } from 'lucide-react'

import { cn } from '@/lib/utils'

const DropdownMenu = ({ ...props }: MenuPrimitive.Root.Props) => (
	<MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
)

const DropdownMenuTrigger = ({
	asChild,
	children,
	...props
}: MenuPrimitive.Trigger.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<MenuPrimitive.Trigger
				data-slot="dropdown-menu-trigger"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props}>
			{children}
		</MenuPrimitive.Trigger>
	)
}

const DropdownMenuGroup = ({ ...props }: MenuPrimitive.Group.Props) => (
	<MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
)

const DropdownMenuPortal = ({ ...props }: MenuPrimitive.Portal.Props) => (
	<MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
)

const DropdownMenuSub = ({ ...props }: MenuPrimitive.Root.Props) => (
	<MenuPrimitive.Root data-slot="dropdown-menu-sub" {...props} />
)

const DropdownMenuRadioGroup = ({
	...props
}: MenuPrimitive.RadioGroup.Props) => (
	<MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
)

const DropdownMenuSubTrigger = ({
	className,
	inset,
	children,
	...props
}: MenuPrimitive.SubmenuTrigger.Props & {
	inset?: boolean
}) => (
	<MenuPrimitive.SubmenuTrigger
		data-slot="dropdown-menu-sub-trigger"
		className={cn(
			'focus:bg-primary/20 data-[popup-open]:bg-primary flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
			inset && 'pl-8',
			className
		)}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto" />
	</MenuPrimitive.SubmenuTrigger>
)

const DropdownMenuSubContent = ({
	className,
	sideOffset = 4,
	...props
}: MenuPrimitive.Popup.Props &
	Pick<MenuPrimitive.Positioner.Props, 'sideOffset'>) => (
	<MenuPrimitive.Portal>
		<MenuPrimitive.Positioner sideOffset={sideOffset} className="isolate z-50">
			<MenuPrimitive.Popup
				data-slot="dropdown-menu-sub-content"
				className={cn(
					'bg-popover text-popover-foreground data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg',
					className
				)}
				{...props}
			/>
		</MenuPrimitive.Positioner>
	</MenuPrimitive.Portal>
)

const DropdownMenuContent = ({
	className,
	sideOffset = 4,
	side,
	align,
	...props
}: MenuPrimitive.Popup.Props &
	Pick<MenuPrimitive.Positioner.Props, 'sideOffset' | 'side' | 'align'>) => (
	<MenuPrimitive.Portal>
		<MenuPrimitive.Positioner
			sideOffset={sideOffset}
			side={side}
			align={align}
			className="isolate z-50"
		>
			<MenuPrimitive.Popup
				data-slot="dropdown-menu-content"
				className={cn(
					'bg-popover text-popover-foreground data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1 shadow-md',
					className
				)}
				{...props}
			/>
		</MenuPrimitive.Positioner>
	</MenuPrimitive.Portal>
)

const DropdownMenuItem = ({
	className,
	inset,
	asChild,
	children,
	...props
}: MenuPrimitive.Item.Props & {
	inset?: boolean
	asChild?: boolean
}) => {
	const mergedClassName = cn(
		'focus:bg-primary/20 relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-hidden transition-colors select-none focus:ring data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
		inset && 'pl-8',
		className
	)
	if (asChild && React.isValidElement(children)) {
		return (
			<MenuPrimitive.Item
				data-slot="dropdown-menu-item"
				className={mergedClassName}
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<MenuPrimitive.Item
			data-slot="dropdown-menu-item"
			className={mergedClassName}
			{...props}
		>
			{children}
		</MenuPrimitive.Item>
	)
}

const DropdownMenuCheckboxItem = ({
	className,
	children,
	checked,
	...props
}: MenuPrimitive.CheckboxItem.Props) => (
	<MenuPrimitive.CheckboxItem
		data-slot="dropdown-menu-checkbox-item"
		className={cn(
			'focus:bg-primary/20 relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50',
			className
		)}
		checked={checked}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<MenuPrimitive.CheckboxItemIndicator>
				<Check className="size-4" />
			</MenuPrimitive.CheckboxItemIndicator>
		</span>
		{children}
	</MenuPrimitive.CheckboxItem>
)

const DropdownMenuRadioItem = ({
	className,
	children,
	...props
}: MenuPrimitive.RadioItem.Props) => (
	<MenuPrimitive.RadioItem
		data-slot="dropdown-menu-radio-item"
		className={cn(
			'focus:bg-primary/20 relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50',
			className
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<MenuPrimitive.RadioItemIndicator>
				<Circle className="size-2 fill-current" />
			</MenuPrimitive.RadioItemIndicator>
		</span>
		{children}
	</MenuPrimitive.RadioItem>
)

const DropdownMenuLabel = ({
	className,
	inset,
	...props
}: MenuPrimitive.GroupLabel.Props & {
	inset?: boolean
}) => (
	<MenuPrimitive.GroupLabel
		data-slot="dropdown-menu-label"
		className={cn(
			'px-2 py-1.5 text-sm font-semibold',
			inset && 'pl-8',
			className
		)}
		{...props}
	/>
)

const DropdownMenuSeparator = ({
	className,
	...props
}: MenuPrimitive.Separator.Props) => (
	<MenuPrimitive.Separator
		data-slot="dropdown-menu-separator"
		className={cn('bg-muted -mx-1 my-1 h-px', className)}
		{...props}
	/>
)

const DropdownMenuShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
			{...props}
		/>
	)
}

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
}
