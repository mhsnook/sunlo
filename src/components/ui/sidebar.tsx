import * as React from 'react'
import { Slot } from '@/lib/slot'
import { PanelLeft, X } from 'lucide-react'

import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'

const SIDEBAR_COOKIE_NAME = 'sidebar:state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = '14rem'
const SIDEBAR_WIDTH_MOBILE = '18rem'
const SIDEBAR_WIDTH_ICON = '3rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'
const styles = {
	'--sidebar-width': SIDEBAR_WIDTH,
	'--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
} as React.CSSProperties

const widthStyles = {
	'--sidebar-width': SIDEBAR_WIDTH_MOBILE,
} as React.CSSProperties

type SidebarContextType = {
	state: 'expanded' | 'collapsed'
	open: boolean
	setOpen: (open: boolean) => void
	openMobile: boolean
	setOpenMobile: (open: boolean) => void
	setClosedMobile: () => void
	isMobile: boolean
	toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextType | null>(null)

function useSidebar() {
	const context = React.useContext(SidebarContext)
	if (!context) {
		throw new Error('useSidebar must be used within a SidebarProvider.')
	}

	return context
}

const SidebarProvider = ({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	children,
	...props
}: React.ComponentProps<'div'> & {
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
}) => {
	const isMobile = useIsMobile()
	const [openMobile, setOpenMobile] = React.useState(false)

	// This is the internal state of the sidebar.
	// We use openProp and setOpenProp for control from outside the component.
	const [_open, _setOpen] = React.useState(defaultOpen)
	const open = openProp ?? _open
	const setOpen = React.useCallback(
		(value: boolean | ((value: boolean) => boolean)) => {
			const openState = typeof value === 'function' ? value(open) : value
			if (setOpenProp) {
				setOpenProp(openState)
			} else {
				_setOpen(openState)
			}

			// This sets the cookie to keep the sidebar state.
			document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
		},
		[open, setOpenProp]
	)

	// Helper to toggle the sidebar.
	const toggleSidebar = React.useCallback(() => {
		return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
	}, [isMobile, setOpen, setOpenMobile])

	// Adds a keyboard shortcut to toggle the sidebar.
	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
				(event.metaKey || event.ctrlKey)
			) {
				event.preventDefault()
				toggleSidebar()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [toggleSidebar])

	// We add a state so that we can do data-state="expanded" or "collapsed".
	// This makes it easier to style the sidebar with Tailwind classes.
	const state = open ? 'expanded' : 'collapsed'

	const contextValue: SidebarContextType = {
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		setClosedMobile: () => setOpenMobile(false),
		toggleSidebar,
	}

	return (
		<SidebarContext.Provider value={contextValue}>
			<TooltipProvider delayDuration={0}>
				<div
					style={styles}
					className={cn(
						'group/sidebar-wrapper has-data-[variant=inset]:bg-lum-1 flex min-h-svh w-full',
						className
					)}
					data-slot="siebar-context-provider"
					{...props}
				>
					{children}
				</div>
			</TooltipProvider>
		</SidebarContext.Provider>
	)
}
SidebarProvider.displayName = 'SidebarProvider'

const Sidebar = ({
	side = 'left',
	variant = 'sidebar',
	collapsible = 'offcanvas',
	className,
	children,
	...props
}: React.ComponentProps<'div'> & {
	side?: 'left' | 'right'
	variant?: 'sidebar' | 'floating' | 'inset'
	collapsible?: 'offcanvas' | 'icon' | 'none'
}) => {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

	if (collapsible === 'none') {
		return (
			<div
				className={cn(
					'bg-lum-1 text-con-mhigh flex h-full w-(--sidebar-width) flex-col',
					className
				)}
				data-slot="sidebar"
				{...props}
			>
				{children}
			</div>
		)
	}

	if (isMobile) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
				<SheetTitle className="sr-only">App sidebar</SheetTitle>
				<SheetContent
					data-sidebar="sidebar"
					data-mobile="true"
					aria-describedby={undefined}
					className="bg-lum-1 text-con-mhigh w-(--sidebar-width) p-0 [&>button]:hidden"
					style={widthStyles}
					side={side}
				>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		)
	}

	return (
		<div
			data-slot="sidebar"
			className="group peer text-con-mhigh hidden shrink-0 md:block"
			data-state={state}
			data-collapsible={state === 'collapsed' ? collapsible : ''}
			data-variant={variant}
			data-side={side}
		>
			{/* This is what handles the sidebar gap on desktop */}
			<div
				className={cn(
					'relative h-svh w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
					'group-data-[collapsible=offcanvas]:w-0',
					'group-data-[side=right]:rotate-180',
					variant === 'floating' || variant === 'inset'
						? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
						: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
				)}
			/>
			<div
				className={cn(
					'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
					side === 'left'
						? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
						: 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
					// Adjust the padding for floating and inset variants.
					variant === 'floating' || variant === 'inset'
						? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
						: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
					className
				)}
				{...props}
			>
				<div
					data-sidebar="sidebar"
					className="bg-lum-1 group-data-[variant=floating]:border-lum-3 flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
				>
					{children}
				</div>
			</div>
		</div>
	)
}
Sidebar.displayName = 'Sidebar'

const SidebarTrigger = ({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Button>) => {
	const { toggleSidebar, openMobile, isMobile } = useSidebar()
	const onButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		onClick?.(event)
		toggleSidebar()
	}
	const showTheX = isMobile && openMobile

	return (
		<Button
			data-slot="sidebar-trigger"
			data-sidebar="trigger"
			variant="ghost"
			size="icon"
			className={`${className} z-50`}
			onClick={onButtonClick}
			{...props}
		>
			<span
				className={`grid grid-cols-1 grid-rows-1 [grid-template-areas:'stack']`}
			>
				<PanelLeft
					className={`[grid-area:stack] ${!showTheX ? '' : 'invisible'}`}
				/>
				<X className={`[grid-area:stack] ${showTheX ? '' : 'invisible'}`} />
			</span>
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	)
}
SidebarTrigger.displayName = 'SidebarTrigger'

const SidebarRail = ({
	className,
	...props
}: React.ComponentProps<'button'>) => {
	const { toggleSidebar } = useSidebar()

	return (
		<button
			data-slot="sidebar-rail"
			data-sidebar="rail"
			aria-label="Toggle Sidebar"
			tabIndex={-1}
			onClick={toggleSidebar}
			className={cn(
				'hover:after:bg-lum-3 absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex',
				'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
				'[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
				'hover:group-data-[collapsible=offcanvas]:bg-lum-1 group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
				'[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
				'[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
				className
			)}
			{...props}
		/>
	)
}
SidebarRail.displayName = 'SidebarRail'

const SidebarInset = ({
	className,
	...props
}: React.ComponentProps<'main'>) => {
	return (
		<main
			data-slot="sidebar-inset"
			className={cn(
				'hue-neutral bg-lum-1 relative flex min-h-svh flex-1 flex-col',
				'peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
				className
			)}
			{...props}
		/>
	)
}
SidebarInset.displayName = 'SidebarInset'

const SidebarInput = ({
	className,
	...props
}: React.ComponentProps<typeof Input>) => {
	return (
		<Input
			data-slot="sidebar-input"
			data-sidebar="input"
			className={cn(
				'bg-lum-1 focus-visible:outline-con-high h-8 w-full shadow-none focus-visible:outline-2',
				className
			)}
			{...props}
		/>
	)
}
SidebarInput.displayName = 'SidebarInput'

const SidebarHeader = ({
	className,
	...props
}: React.ComponentProps<'div'>) => {
	return (
		<div
			data-slot="sidebar-header"
			data-sidebar="header"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	)
}
SidebarHeader.displayName = 'SidebarHeader'

const SidebarFooter = ({
	className,
	...props
}: React.ComponentProps<'div'>) => {
	return (
		<div
			data-slot="sidebar-footer"
			data-sidebar="footer"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	)
}
SidebarFooter.displayName = 'SidebarFooter'

const SidebarSeparator = ({
	className,
	...props
}: React.ComponentProps<typeof Separator>) => {
	return (
		<Separator
			data-slot="sidebar-separator"
			data-sidebar="separator"
			className={cn('bg-lum-3 mx-2 w-auto', className)}
			{...props}
		/>
	)
}
SidebarSeparator.displayName = 'SidebarSeparator'

const SidebarContent = ({
	className,
	...props
}: React.ComponentProps<'div'>) => {
	return (
		<div
			data-slot="sidebar-content"
			data-sidebar="content"
			className={cn(
				'flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto [scrollbar-width:thin] group-data-[collapsible=icon]:overflow-hidden',
				className
			)}
			{...props}
		/>
	)
}
SidebarContent.displayName = 'SidebarContent'

const SidebarGroup = ({ className, ...props }: React.ComponentProps<'div'>) => {
	return (
		<div
			data-slot="sidebar-group"
			data-sidebar="group"
			className={cn('relative flex w-full min-w-0 flex-col p-1.5', className)}
			{...props}
		/>
	)
}
SidebarGroup.displayName = 'SidebarGroup'

const SidebarGroupLabel = ({
	className,
	asChild = false,
	...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) => {
	const Comp = asChild ? Slot : 'div'

	return (
		<Comp
			data-slot="sidebar-group-label"
			data-sidebar="group-label"
			className={cn(
				'text-con-mid outline-con-high flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opa] duration-200 ease-linear focus-visible:outline-2 [&>svg]:size-4 [&>svg]:shrink-0',
				'group-data-[collapsible=icon]:-mt-4 group-data-[collapsible=icon]:opacity-0',
				className
			)}
			{...props}
		/>
	)
}
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

const SidebarGroupAction = ({
	className,
	asChild = false,
	...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) => {
	const Comp = asChild ? Slot : 'button'

	return (
		<Comp
			data-slot="sidebar-group-action"
			data-sidebar="group-action"
			className={cn(
				'text-con-mhigh outline-con-high hover:bg-lum-2 hover:text-lum-9 absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 transition-transform focus-visible:outline-2 [&>svg]:size-4 [&>svg]:shrink-0',
				// Increases the hit area of the button on mobile.
				'after:absolute after:-inset-2 md:after:hidden',
				'group-data-[collapsible=icon]:hidden',
				className
			)}
			{...props}
		/>
	)
}
SidebarGroupAction.displayName = 'SidebarGroupAction'

const SidebarGroupContent = ({
	className,
	...props
}: React.ComponentProps<'div'>) => (
	<div
		data-slot="sidebar-group-content"
		data-sidebar="group-content"
		className={cn('w-full text-sm', className)}
		{...props}
	/>
)
SidebarGroupContent.displayName = 'SidebarGroupContent'

const SidebarMenu = ({ className, ...props }: React.ComponentProps<'ul'>) => (
	<ul
		data-slot="sidebar-menu"
		data-sidebar="menu"
		className={cn('flex w-full min-w-0 flex-col gap-1', className)}
		{...props}
	/>
)
SidebarMenu.displayName = 'SidebarMenu'

const SidebarMenuItem = ({
	className,
	...props
}: React.ComponentProps<'li'>) => (
	<li
		data-slot="sidebara-menu-item"
		data-sidebar="menu-item"
		className={cn('group/menu-item relative', className)}
		{...props}
	/>
)
SidebarMenuItem.displayName = 'SidebarMenuItem'

const menuButtonVariants = {
	default: 'sidebar-menu-button-variant-default',
	outline: 'sidebar-menu-button-variant-outline',
} as const

const menuButtonSizes = {
	default: 'sidebar-menu-button-size-default',
	sm: 'sidebar-menu-button-size-sm',
	lg: 'sidebar-menu-button-size-lg',
} as const

const SidebarMenuButton = ({
	asChild = false,
	isActive = false,
	variant = 'default',
	size = 'default',
	tooltip,
	className,
	...props
}: React.ComponentProps<'button'> & {
	asChild?: boolean
	isActive?: boolean
	tooltip?: string | React.ComponentProps<typeof TooltipContent>
	variant?: keyof typeof menuButtonVariants
	size?: keyof typeof menuButtonSizes
}) => {
	const Comp = asChild ? Slot : 'button'
	const { isMobile, state } = useSidebar()

	const button = (
		<Comp
			data-slot="sidebar-menu-button"
			data-sidebar="menu-button"
			data-size={size}
			data-active={isActive}
			className={cn(
				`peer/menu-button sidebar-menu-button ${menuButtonVariants[variant]} ${menuButtonSizes[size]}`,
				className
			)}
			{...props}
		/>
	)

	if (!tooltip) {
		return button
	}

	if (typeof tooltip === 'string') {
		tooltip = {
			children: tooltip,
		}
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent
				side="right"
				align="center"
				hidden={state !== 'collapsed' || isMobile}
				{...tooltip}
			/>
		</Tooltip>
	)
}
SidebarMenuButton.displayName = 'SidebarMenuButton'

const SidebarMenuAction = ({
	className,
	asChild = false,
	showOnHover = false,
	...props
}: React.ComponentProps<'button'> & {
	asChild?: boolean
	showOnHover?: boolean
}) => {
	const Comp = asChild ? Slot : 'button'

	return (
		<Comp
			data-slot="sidebar-menu-action"
			data-sidebar="menu-action"
			className={cn(
				'text-con-mhigh outline-con-high hover:bg-lum-2 hover:text-lum-9 peer-hover/menu-button:text-lum-9 absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 transition-transform focus-visible:outline-2 [&>svg]:size-4 [&>svg]:shrink-0',
				// Increases the hit area of the button on mobile.
				'after:absolute after:-inset-2 md:after:hidden',
				'peer-data-[size=sm]/menu-button:top-1',
				'peer-data-[size=default]/menu-button:top-1.5',
				'peer-data-[size=lg]/menu-button:top-2.5',
				'group-data-[collapsible=icon]:hidden',
				showOnHover &&
					'peer-data-[active=true]/menu-button:text-lum-9 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[popup-open]:opacity-100 md:opacity-0',
				className
			)}
			{...props}
		/>
	)
}
SidebarMenuAction.displayName = 'SidebarMenuAction'

const SidebarMenuBadge = ({
	className,
	...props
}: React.ComponentProps<'div'>) => (
	<div
		data-slot="sidebar-menu-badge"
		data-sidebar="menu-badge"
		className={cn(
			'text-con-mhigh pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none',
			'peer-hover/menu-button:text-lum-9 peer-data-[active=true]/menu-button:text-lum-9',
			'peer-data-[size=sm]/menu-button:top-1',
			'peer-data-[size=default]/menu-button:top-1.5',
			'peer-data-[size=lg]/menu-button:top-2.5',
			'group-data-[collapsible=icon]:hidden',
			className
		)}
		{...props}
	/>
)
SidebarMenuBadge.displayName = 'SidebarMenuBadge'

const SidebarMenuSkeleton = ({
	className,
	showIcon = false,
	...props
}: React.ComponentProps<'div'> & {
	showIcon?: boolean
}) => {
	// Random width between 50 to 90%.
	const skeletonWidth = { width: `${Math.floor(Math.random() * 40) + 50}%` }

	return (
		<div
			data-slot="sidebar-menu-skeleton"
			data-sidebar="menu-skeleton"
			className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
			{...props}
		>
			{showIcon && (
				<Skeleton
					className="size-4 rounded-md"
					data-sidebar="menu-skeleton-icon"
				/>
			)}
			<Skeleton
				className="h-4 max-w-(--skeleton-width) flex-1"
				data-sidebar="menu-skeleton-text"
				style={skeletonWidth}
			/>
		</div>
	)
}
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton'

const SidebarMenuSub = ({
	className,
	...props
}: React.ComponentProps<'ul'>) => (
	<ul
		data-slot="sidebaar-menu-sub"
		data-sidebar="menu-sub"
		className={cn(
			'border-lum-3 mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
			'group-data-[collapsible=icon]:hidden',
			className
		)}
		{...props}
	/>
)
SidebarMenuSub.displayName = 'SidebarMenuSub'

const SidebarMenuSubItem = ({ ...props }: React.ComponentProps<'li'>) => (
	<li data-slot="sidebar-menu-sub-item" {...props} />
)
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem'

const SidebarMenuSubButton = ({
	asChild = false,
	size = 'md',
	isActive,
	className,
	...props
}: React.ComponentProps<'a'> & {
	asChild?: boolean
	size?: 'sm' | 'md'
	isActive?: boolean
}) => {
	const Comp = asChild ? Slot : 'a'

	return (
		<Comp
			data-slot="sidebar-menu-sub-button"
			data-sidebar="menu-sub-button"
			data-size={size}
			data-active={isActive}
			className={cn(
				'text-con-mhigh outline-con-high hover:bg-lum-2 hover:text-lum-9 active:bg-lum-2 active:text-lum-9 [&>svg]:text-lum-9 flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
				'data-[active=true]:bg-lum-2 data-[active=true]:text-lum-9',
				size === 'sm' && 'text-xs',
				size === 'md' && 'text-sm',
				'group-data-[collapsible=icon]:hidden',
				className
			)}
			{...props}
		/>
	)
}
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton'

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
}
