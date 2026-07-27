import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Sheet = ({ ...props }: SheetPrimitive.Root.Props) => (
	<SheetPrimitive.Root data-slot="sheet" {...props} />
)

const SheetTrigger = ({ ...props }: SheetPrimitive.Trigger.Props) => (
	<SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
)

const SheetClose = ({ ...props }: SheetPrimitive.Close.Props) => (
	<SheetPrimitive.Close data-slot="sheet-close" {...props} />
)

const SheetPortal = ({ ...props }: SheetPrimitive.Portal.Props) => (
	<SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
)

const SheetOverlay = ({
	className,
	...props
}: SheetPrimitive.Backdrop.Props) => (
	<SheetPrimitive.Backdrop
		className={cn(
			'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-40 bg-black/80',
			className
		)}
		{...props}
		data-slot="sheet-overlay"
	/>
)

const sides = {
	top: 'sheet-side-top',
	bottom: 'sheet-side-bottom',
	left: 'sheet-side-left',
	right: 'sheet-side-right',
} as const
interface SheetContentProps extends SheetPrimitive.Popup.Props {
	side?: keyof typeof sides
}

const SheetContent = ({
	side = 'right',
	className,
	children,
	...props
}: SheetContentProps) => (
	<SheetPortal>
		<SheetOverlay />
		<SheetPrimitive.Popup
			data-slot="sheet-content"
			className={cn(`sheet ${sides[side]}`, className)}
			{...props}
		>
			{children}
			<SheetPrimitive.Close className="focus:outline-con-high data-[open]:bg-lum-2 absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-2 focus:outline-offset-2 disabled:pointer-events-none">
				<X className="size-4" />
				<span className="sr-only">Close</span>
			</SheetPrimitive.Close>
		</SheetPrimitive.Popup>
	</SheetPortal>
)

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col space-y-2 text-center sm:text-left',
			className
		)}
		{...props}
	/>
)

const SheetFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
			className
		)}
		{...props}
	/>
)

const SheetTitle = ({ className, ...props }: SheetPrimitive.Title.Props) => (
	<SheetPrimitive.Title
		data-slot="sheet-title"
		className={cn('text-con-mhigh text-lg font-semibold', className)}
		{...props}
	/>
)

const SheetDescription = ({
	className,
	...props
}: SheetPrimitive.Description.Props) => (
	<SheetPrimitive.Description
		data-slot="sheet-description"
		className={cn('text-con-mid text-sm', className)}
		{...props}
	/>
)

export {
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
}
