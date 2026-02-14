import * as React from 'react'
import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { cva } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

const NavigationMenu = ({
	className,
	children,
	...props
}: NavigationMenuPrimitive.Root.Props) => (
	<NavigationMenuPrimitive.Root
		data-slot="navigation-menu"
		className={cn(
			'relative z-10 flex max-w-max flex-1 items-center justify-center',
			className
		)}
		{...props}
	>
		{children}
		<NavigationMenuViewport />
	</NavigationMenuPrimitive.Root>
)

const NavigationMenuList = ({
	className,
	...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) => (
	<NavigationMenuPrimitive.List
		data-slot="navigation-menu-list"
		className={cn(
			'group flex flex-1 list-none items-center justify-center space-x-1',
			className
		)}
		{...props}
	/>
)

const NavigationMenuItem = ({
	className,
	...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) => (
	<NavigationMenuPrimitive.Item
		data-slot="navigation-menu-item"
		className={cn('relative', className)}
		{...props}
	/>
)

const navigationMenuTriggerStyle = cva(
	'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:bg-accent/50 data-[popup-open]:bg-accent/50'
)

const NavigationMenuTrigger = ({
	className,
	children,
	...props
}: NavigationMenuPrimitive.Trigger.Props) => (
	<NavigationMenuPrimitive.Trigger
		data-slot="navigation-menu-trigger"
		className={cn(navigationMenuTriggerStyle(), 'group', className)}
		{...props}
	>
		{children}{' '}
		<ChevronDown
			className="relative top-[1px] ml-1 size-3 transition duration-200 group-data-[popup-open]:rotate-180"
			aria-hidden="true"
		/>
	</NavigationMenuPrimitive.Trigger>
)

const NavigationMenuContent = ({
	className,
	...props
}: NavigationMenuPrimitive.Content.Props) => (
	<NavigationMenuPrimitive.Content
		data-slot="navigation-menu-content"
		className={cn(
			'data-[open]:animate-in data-[closed]:animate-out data-[open]:fade-in data-[closed]:fade-out top-0 left-0 w-full @3xl:absolute @3xl:w-auto',
			className
		)}
		{...props}
	/>
)

const NavigationMenuLink = ({
	asChild,
	children,
	...props
}: NavigationMenuPrimitive.Link.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<NavigationMenuPrimitive.Link
				data-slot="navigation-menu-link"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<NavigationMenuPrimitive.Link data-slot="navigation-menu-link" {...props}>
			{children}
		</NavigationMenuPrimitive.Link>
	)
}

const NavigationMenuViewport = ({
	className,
	...props
}: React.ComponentProps<'div'>) => (
	<NavigationMenuPrimitive.Portal>
		<NavigationMenuPrimitive.Positioner
			side="bottom"
			sideOffset={6}
			className={cn('isolate z-50', className)}
			{...props}
		>
			<NavigationMenuPrimitive.Popup className="bg-popover text-popover-foreground data-[open]:animate-in data-[closed]:animate-out data-[closed]:zoom-out-95 data-[open]:zoom-in-90 relative overflow-hidden rounded-md border shadow-lg">
				<NavigationMenuPrimitive.Viewport
					data-slot="navigation-menu-viewport"
					className="relative size-full overflow-hidden"
				/>
			</NavigationMenuPrimitive.Popup>
		</NavigationMenuPrimitive.Positioner>
	</NavigationMenuPrimitive.Portal>
)

const NavigationMenuIndicator = ({
	className,
	...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Icon>) => (
	<NavigationMenuPrimitive.Icon
		data-slot="navigation-menu-indicator"
		className={cn(
			'top-full z-1 flex h-1.5 items-end justify-center overflow-hidden',
			className
		)}
		{...props}
	>
		<div className="bg-border relative top-[60%] size-2 rotate-45 rounded-tl-sm shadow-md" />
	</NavigationMenuPrimitive.Icon>
)

export {
	navigationMenuTriggerStyle,
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuContent,
	NavigationMenuTrigger,
	NavigationMenuLink,
	NavigationMenuIndicator,
	NavigationMenuViewport,
}
